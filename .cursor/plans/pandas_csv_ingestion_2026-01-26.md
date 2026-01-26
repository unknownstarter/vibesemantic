# Pandas CSV Ingestion 설계 문서
**작성일**: 2026-01-26  
**목적**: 대용량 CSV 파일 처리를 위한 Pandas 기반 ingestion 파이프라인 구축

## 1. 개요

### 1.1 목표
- 대용량 CSV 파일 (> 50MB) 안정적 처리
- 다양한 CSV 형식 자동 처리 (인코딩, 구분자, 따옴표 등)
- 메모리 효율적인 청크 처리
- 기존 TypeScript 로직과의 하이브리드 운영

### 1.2 아키텍처 변경

**현재 구조:**
```
Next.js API Route
  ↓
TypeScript CSV Parser (parseCsvFull)
  ↓
TypeScript Transformer (transformToMartRecords)
  ↓
Supabase.upsert()
```

**새 구조 (하이브리드):**
```
Next.js API Route
  ↓
파일 크기 체크
  ├─ < 10MB → TypeScript 로직 (기존)
  └─ >= 10MB → Python Brain API 호출
       ↓
     Pandas read_csv (chunksize)
       ↓
     DataFrame 변환
       ↓
     Supabase Python Client.upsert()
```

## 2. 상세 설계

### 2.1 Python Brain API 엔드포인트

**엔드포인트**: `POST /api/v1/collect/csv`

**Request Model:**
```python
class CSVCollectRequest(BaseModel):
    project_id: str
    dataset_id: str
    file_id: str  # csv_files.id
    storage_path: str  # Supabase Storage path
    mapping: dict  # SourceMapping 구조
    date_range: Optional[dict] = None  # {start: str, end: str}
```

**Response Model:**
```python
class CSVCollectResponse(BaseModel):
    total_rows: int
    processed_rows: int
    inserted_records: int
    errors: List[str]
    processing_time_ms: int
```

### 2.2 Python 구현 로직

**파일 위치**: `python-brain/app/services/csv_ingest.py`

**주요 함수:**
1. `download_csv_from_storage()` - Supabase Storage에서 파일 다운로드
2. `parse_csv_with_pandas()` - Pandas로 CSV 파싱 (chunksize 지원)
3. `transform_to_mart_records()` - DataFrame을 mart_csv_daily_metrics 형식으로 변환
4. `upsert_to_supabase()` - 배치 upsert (1000개씩)

**핵심 로직:**
```python
def ingest_csv_file(
    supabase: Client,
    project_id: str,
    dataset_id: str,
    file_path: str,
    mapping: dict,
    date_range: Optional[dict] = None
) -> CSVCollectResponse:
    # 1. 파일 다운로드
    file_data = download_csv_from_storage(supabase, file_path)
    
    # 2. Pandas로 파싱 (대용량 파일은 chunksize 사용)
    file_size_mb = len(file_data) / (1024 * 1024)
    chunksize = 10000 if file_size_mb > 50 else None
    
    if chunksize:
        # 청크 단위 처리
        for chunk_df in pd.read_csv(
            io.StringIO(file_data),
            chunksize=chunksize,
            encoding='utf-8',
            on_bad_lines='skip'
        ):
            records = transform_dataframe_to_records(chunk_df, mapping, ...)
            upsert_batch(supabase, records)
    else:
        # 전체 파일 처리
        df = pd.read_csv(io.StringIO(file_data), encoding='utf-8')
        records = transform_dataframe_to_records(df, mapping, ...)
        upsert_batch(supabase, records)
```

### 2.3 TypeScript 통합

**파일 위치**: `src/lib/csv/ingest.ts`

**변경 사항:**
1. 파일 크기 체크 로직 추가
2. Python API 호출 함수 추가
3. 하이브리드 라우팅 로직

```typescript
export async function ingestDataset(
  supabase: SupabaseClient<Database>,
  projectId: string,
  datasetId: string,
  mapping: SourceMapping,
  dateRangeFilter?: { startDate: Date; endDate: Date }
): Promise<IngestResult> {
  // Get files
  const { data: files } = await supabase.from('csv_files')...
  
  for (const file of files) {
    // 파일 크기 체크
    const fileSizeMB = (file.file_size_bytes || 0) / (1024 * 1024)
    const usePandas = fileSizeMB >= 10 // 10MB 이상은 Pandas 사용
    
    if (usePandas) {
      // Python Brain API 호출
      result = await ingestViaPandasAPI(file, mapping, dateRangeFilter)
    } else {
      // 기존 TypeScript 로직
      result = await ingestViaTypeScript(file, mapping, dateRangeFilter)
    }
  }
}
```

### 2.4 에러 처리

**Python 측:**
- Pandas 파싱 에러 → 상세 로그 + 스킵
- Supabase 연결 에러 → 재시도 로직 (3회)
- 타임아웃 → 청크 크기 조정 후 재시도

**TypeScript 측:**
- API 호출 실패 → 기존 TypeScript 로직으로 fallback
- 네트워크 에러 → 명확한 에러 메시지
- 타임아웃 → 5분 타임아웃 설정

## 3. 데이터베이스 변경사항

### 3.1 확인 필요 사항
- `mart_csv_daily_metrics` 테이블 구조 변경 불필요 (현재 구조 유지)
- `csv_files` 테이블에 `ingestion_method` 컬럼 추가 고려 (선택사항)
  - 값: 'typescript' | 'pandas'
  - 목적: 모니터링 및 디버깅

### 3.2 마이그레이션 (선택사항)
```sql
-- csv_files 테이블에 ingestion_method 컬럼 추가
ALTER TABLE csv_files
  ADD COLUMN IF NOT EXISTS ingestion_method TEXT DEFAULT 'typescript';

COMMENT ON COLUMN csv_files.ingestion_method IS 
  'CSV ingestion method used: typescript or pandas';
```

## 4. 성능 최적화

### 4.1 Pandas 최적화
- PyArrow 엔진 사용 (가능한 경우)
- dtype 명시적 지정으로 메모리 절약
- 청크 크기 동적 조정 (파일 크기 기반)

### 4.2 배치 처리
- Supabase upsert 배치 크기: 1000개
- 병렬 처리 고려 (여러 파일 동시 처리 시)

## 5. 모니터링 및 로깅

### 5.1 로그 항목
- 파일 크기
- 사용된 ingestion 방법 (TypeScript/Pandas)
- 처리 시간
- 에러 발생 시 상세 정보

### 5.2 메트릭
- Pandas 사용률
- 평균 처리 시간 (파일 크기별)
- 에러율

## 6. 테스트 계획

### 6.1 단위 테스트
- Python CSV 파싱 로직
- DataFrame 변환 로직
- TypeScript API 호출 로직

### 6.2 통합 테스트
- 소규모 파일 (< 10MB) → TypeScript
- 중규모 파일 (10-50MB) → Pandas
- 대규모 파일 (> 50MB) → Pandas 청크 처리

### 6.3 성능 테스트
- 100MB 파일 처리 시간
- 메모리 사용량 모니터링
- 동시 처리 성능

## 7. 배포 계획

### 7.1 단계별 배포
1. **Phase 1**: Python 엔드포인트 구현 및 테스트
2. **Phase 2**: TypeScript 통합 및 하이브리드 라우팅
3. **Phase 3**: 베타 테스트 및 모니터링
4. **Phase 4**: 프로덕션 배포

### 7.2 롤백 계획
- Python API 실패 시 자동으로 TypeScript 로직으로 fallback
- 환경 변수로 Pandas 사용 on/off 제어 가능

## 8. 위험도 및 대응

| 위험 | 위험도 | 대응 방안 |
|------|--------|-----------|
| Python API 타임아웃 | 중 | 타임아웃 증가 + 청크 크기 조정 |
| 메모리 부족 | 낮음 | 청크 처리로 해결 |
| 데이터 불일치 | 낮음 | 동일한 변환 로직 사용 |
| 네트워크 에러 | 중 | 재시도 + TypeScript fallback |

## 9. 참고사항

- Pandas는 이미 `requirements.txt`에 포함됨
- Python Brain API는 이미 배포되어 있음
- 기존 TypeScript 로직은 유지 (하이브리드 운영)

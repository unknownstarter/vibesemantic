FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 코드 복사
COPY app/ ./app/

# 환경 변수
ENV PYTHONUNBUFFERED=1

# 포트 (Render는 $PORT 환경 변수 사용)
EXPOSE 8080

# 실행 (Render의 $PORT 환경 변수 사용)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}

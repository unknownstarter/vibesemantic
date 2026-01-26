"""
Statistical Analysis Module
Provides correlation, regression, and causality inference for metrics and events
"""

from typing import Dict, List, Any, Optional
import numpy as np
from scipy import stats
from scipy.stats import pearsonr, spearmanr


def calculate_correlation(
    x: List[float],
    y: List[float],
    method: str = "pearson"
) -> Dict[str, Any]:
    """
    Calculate correlation between two time series
    
    Args:
        x: First time series
        y: Second time series
        method: "pearson" or "spearman"
    
    Returns:
        Dictionary with correlation coefficient, p-value, and interpretation
    """
    if len(x) != len(y) or len(x) < 3:
        return {
            "coefficient": None,
            "p_value": None,
            "significant": False,
            "strength": None,
            "interpretation": "Insufficient data for correlation analysis"
        }
    
    # Remove NaN values
    pairs = [(xi, yi) for xi, yi in zip(x, y) if not (np.isnan(xi) or np.isnan(yi))]
    if len(pairs) < 3:
        return {
            "coefficient": None,
            "p_value": None,
            "significant": False,
            "strength": None,
            "interpretation": "Insufficient valid data points"
        }
    
    x_clean, y_clean = zip(*pairs)
    
    try:
        if method == "pearson":
            corr, p_value = pearsonr(list(x_clean), list(y_clean))
        else:
            corr, p_value = spearmanr(list(x_clean), list(y_clean))
        
        # Interpret strength
        abs_corr = abs(corr)
        if abs_corr >= 0.7:
            strength = "strong"
        elif abs_corr >= 0.4:
            strength = "moderate"
        elif abs_corr >= 0.2:
            strength = "weak"
        else:
            strength = "very weak"
        
        # Determine direction
        direction = "positive" if corr > 0 else "negative"
        
        # Significance (p < 0.05)
        significant = p_value < 0.05 if p_value is not None else False
        
        interpretation = f"{strength.capitalize()} {direction} correlation"
        if significant:
            interpretation += " (statistically significant)"
        else:
            interpretation += " (not statistically significant)"
        
        return {
            "coefficient": round(float(corr), 4),
            "p_value": round(float(p_value), 6) if p_value is not None else None,
            "significant": significant,
            "strength": strength,
            "direction": direction,
            "interpretation": interpretation
        }
    except Exception as e:
        return {
            "coefficient": None,
            "p_value": None,
            "significant": False,
            "strength": None,
            "interpretation": f"Error calculating correlation: {str(e)}"
        }


def calculate_regression(
    x: List[float],
    y: List[float]
) -> Dict[str, Any]:
    """
    Calculate linear regression between two time series
    
    Args:
        x: Independent variable (time series)
        y: Dependent variable (time series)
    
    Returns:
        Dictionary with slope, intercept, r-squared, and interpretation
    """
    if len(x) != len(y) or len(x) < 3:
        return {
            "slope": None,
            "intercept": None,
            "r_squared": None,
            "p_value": None,
            "interpretation": "Insufficient data for regression analysis"
        }
    
    # Remove NaN values
    pairs = [(xi, yi) for xi, yi in zip(x, y) if not (np.isnan(xi) or np.isnan(yi))]
    if len(pairs) < 3:
        return {
            "slope": None,
            "intercept": None,
            "r_squared": None,
            "p_value": None,
            "interpretation": "Insufficient valid data points"
        }
    
    if not pairs:
        return {
            "slope": None,
            "intercept": None,
            "r_squared": None,
            "p_value": None,
            "interpretation": "Insufficient valid data points"
        }
    
    x_clean, y_clean = zip(*pairs)
    x_array = np.array(x_clean)
    y_array = np.array(y_clean)
    
    try:
        # Linear regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(x_array, y_array)
        r_squared = r_value ** 2
        
        # Interpret slope
        if abs(slope) < 0.01:
            trend = "stable"
        elif slope > 0:
            trend = "increasing"
        else:
            trend = "decreasing"
        
        interpretation = f"Linear relationship: {trend} trend"
        if p_value < 0.05:
            interpretation += " (statistically significant)"
        
        return {
            "slope": round(float(slope), 6),
            "intercept": round(float(intercept), 4),
            "r_squared": round(float(r_squared), 4),
            "p_value": round(float(p_value), 6) if p_value is not None else None,
            "std_err": round(float(std_err), 6),
            "trend": trend,
            "interpretation": interpretation
        }
    except Exception as e:
        return {
            "slope": None,
            "intercept": None,
            "r_squared": None,
            "p_value": None,
            "interpretation": f"Error calculating regression: {str(e)}"
        }


def analyze_metric_correlations(
    daily_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Analyze correlations between different metrics in daily data
    
    Args:
        daily_data: List of daily metric records
    
    Returns:
        List of correlation analyses between metric pairs
    """
    if not daily_data or len(daily_data) < 3:
        return []
    
    # Extract time series for common metrics
    metrics_map = {}
    metric_names = set()
    
    for record in daily_data:
        # Extract date for alignment
        date = record.get("date")
        if not date:
            continue
        
        # Extract all numeric metrics
        for key, value in record.items():
            if key == "date" or not isinstance(value, (int, float)):
                continue
            
            if key not in metrics_map:
                metrics_map[key] = {}
            metrics_map[key][date] = float(value) if value is not None else 0
            metric_names.add(key)
    
    # Align time series by date
    all_dates = set()
    for metric_data in metrics_map.values():
        all_dates.update(metric_data.keys())
    all_dates = sorted(list(all_dates))
    
    # Build aligned arrays
    aligned_metrics = {}
    for metric_name in metric_names:
        aligned_metrics[metric_name] = [
            metrics_map[metric_name].get(date, 0) for date in all_dates
        ]
    
    # Calculate correlations between metric pairs
    correlations = []
    metric_list = list(metric_names)
    
    for i, metric1 in enumerate(metric_list):
        for metric2 in metric_list[i+1:]:
            x = aligned_metrics[metric1]
            y = aligned_metrics[metric2]
            
            # Skip if both are constant (no variation)
            try:
                if len(x) < 2 or len(y) < 2:
                    continue
                if np.std(x) == 0 or np.std(y) == 0:
                    continue
            except (ValueError, TypeError):
                continue
            
            corr_result = calculate_correlation(x, y, method="pearson")
            
            if corr_result["coefficient"] is not None and corr_result["significant"]:
                correlations.append({
                    "metric1": metric1,
                    "metric2": metric2,
                    "correlation": corr_result,
                    "insight": f"{metric1} and {metric2} show {corr_result['strength']} {corr_result['direction']} correlation"
                })
    
    # Sort by absolute correlation coefficient
    # Filter out None coefficients before sorting
    valid_correlations = [
        c for c in correlations 
        if c.get("correlation", {}).get("coefficient") is not None
    ]
    valid_correlations.sort(key=lambda x: abs(x["correlation"]["coefficient"]), reverse=True)
    
    return valid_correlations[:10]  # Return top 10 correlations


def analyze_event_relationships(
    events_data: List[Dict[str, Any]],
    kpis_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Analyze relationships between events and KPIs
    
    Args:
        events_data: List of event records with date, event_name, event_count
        kpis_data: List of KPI records with date and various metrics
    
    Returns:
        List of event-KPI relationship analyses
    """
    if not events_data or not kpis_data:
        return []
    
    # Group events by date and event_name
    events_by_date = {}
    for event in events_data:
        date = event.get("date")
        event_name = event.get("event_name")
        event_count = event.get("event_count", 0)
        
        if not date or not event_name:
            continue
        
        if date not in events_by_date:
            events_by_date[date] = {}
        events_by_date[date][event_name] = float(event_count) if event_count else 0
    
    # Group KPIs by date
    kpis_by_date = {}
    for kpi in kpis_data:
        date = kpi.get("date")
        if not date:
            continue
        kpis_by_date[date] = kpi
    
    # Find common dates
    common_dates = sorted(set(events_by_date.keys()) & set(kpis_by_date.keys()))
    
    if len(common_dates) < 3:
        return []
    
    relationships = []
    
    # Analyze each event against key KPIs
    event_names = set()
    for date_events in events_by_date.values():
        event_names.update(date_events.keys())
    
    kpi_metrics = ["sessions", "active_users", "engagement_rate", "bounce_rate"]
    
    for event_name in event_names:
        event_counts = [
            events_by_date.get(date, {}).get(event_name, 0)
            for date in common_dates
        ]
        
        for kpi_metric in kpi_metrics:
            kpi_values = []
            for date in common_dates:
                kpi_record = kpis_by_date.get(date, {})
                value = kpi_record.get(kpi_metric)
                if value is not None:
                    kpi_values.append(float(value))
                else:
                    kpi_values.append(0)
            
            try:
                if len(event_counts) < 2 or len(kpi_values) < 2:
                    continue
                if np.std(event_counts) == 0 or np.std(kpi_values) == 0:
                    continue
            except (ValueError, TypeError):
                continue
            
            corr_result = calculate_correlation(event_counts, kpi_values)
            
            if corr_result["coefficient"] is not None and corr_result["significant"]:
                relationships.append({
                    "event_name": event_name,
                    "kpi_metric": kpi_metric,
                    "correlation": corr_result,
                    "insight": f"{event_name} events show {corr_result['strength']} {corr_result['direction']} correlation with {kpi_metric}"
                })
    
    # Sort by absolute correlation coefficient
    # Filter out None coefficients before sorting
    valid_relationships = [
        r for r in relationships 
        if r.get("correlation", {}).get("coefficient") is not None
    ]
    valid_relationships.sort(key=lambda x: abs(x["correlation"]["coefficient"]), reverse=True)
    
    return valid_relationships[:10]  # Return top 10 relationships


def infer_causality_hints(
    correlations: List[Dict[str, Any]],
    daily_trends: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Infer potential causality hints from correlations and temporal patterns
    
    Note: This is a heuristic approach. True causality requires controlled experiments.
    
    Args:
        correlations: List of correlation analyses
        daily_trends: Daily trend data
    
    Returns:
        List of potential causality hints
    """
    causality_hints = []
    
    # Strong positive correlations with temporal precedence might suggest causality
    for corr in correlations:
        if not corr.get("correlation", {}).get("significant"):
            continue
        
        coefficient = corr["correlation"].get("coefficient", 0)
        if abs(coefficient) < 0.5:  # Only consider moderate+ correlations
            continue
        
        metric1 = corr.get("metric1") or corr.get("event_name")
        metric2 = corr.get("metric2") or corr.get("kpi_metric")
        
        if not metric1 or not metric2:
            continue
        
        # Check temporal patterns (simplified: if metric1 peaks before metric2)
        # This is a heuristic - not true causality proof
        hint = {
            "metric1": metric1,
            "metric2": metric2,
            "correlation_strength": abs(coefficient),
            "direction": corr["correlation"].get("direction", "positive"),
            "note": "Correlation does not imply causation. This is a statistical hint that requires further investigation.",
            "suggestion": f"Consider A/B testing or controlled experiments to verify if {metric1} influences {metric2}"
        }
        
        causality_hints.append(hint)
    
    return causality_hints[:5]  # Return top 5 hints


def perform_statistical_analysis(
    kpis_data: List[Dict[str, Any]],
    events_data: List[Dict[str, Any]],
    daily_trends: List[Dict[str, Any]],
    channels_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Perform comprehensive statistical analysis on all available data
    
    Args:
        kpis_data: Daily KPI records
        events_data: Event records
        daily_trends: Daily trend data
        channels_data: Channel data (optional)
    
    Returns:
        Dictionary with all statistical analyses
    """
    analysis = {
        "metric_correlations": [],
        "event_kpi_relationships": [],
        "causality_hints": [],
        "summary": ""
    }
    
    # 1. Analyze metric correlations
    if daily_trends:
        analysis["metric_correlations"] = analyze_metric_correlations(daily_trends)
    
    # 2. Analyze event-KPI relationships
    if events_data and kpis_data:
        analysis["event_kpi_relationships"] = analyze_event_relationships(events_data, kpis_data)
    
    # 3. Infer causality hints
    all_correlations = analysis["metric_correlations"] + analysis["event_kpi_relationships"]
    if all_correlations and daily_trends:
        analysis["causality_hints"] = infer_causality_hints(all_correlations, daily_trends)
    
    # 4. Generate summary
    summary_parts = []
    
    if analysis["metric_correlations"]:
        top_corr = analysis["metric_correlations"][0]
        coeff = top_corr.get("correlation", {}).get("coefficient")
        if coeff is not None:
            summary_parts.append(
                f"Strongest metric correlation: {top_corr['metric1']} ↔ {top_corr['metric2']} "
                f"(r={coeff:.3f})"
            )
    
    if analysis["event_kpi_relationships"]:
        top_rel = analysis["event_kpi_relationships"][0]
        coeff = top_rel.get("correlation", {}).get("coefficient")
        if coeff is not None:
            summary_parts.append(
                f"Strongest event-KPI relationship: {top_rel['event_name']} ↔ {top_rel['kpi_metric']} "
                f"(r={coeff:.3f})"
            )
    
    if analysis["causality_hints"]:
        summary_parts.append(
            f"{len(analysis['causality_hints'])} potential causality patterns identified (require experimental validation)"
        )
    
    analysis["summary"] = "; ".join(summary_parts) if summary_parts else "No significant statistical patterns found"
    
    return analysis

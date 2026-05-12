def compute_health_score(telemetry: dict) -> dict:
    base_score = 100.0

    temp = telemetry.get("temperature", 5)
    if temp > 15:
        base_score -= 20
    elif temp > 10:
        base_score -= 10
    elif temp < 0:
        base_score -= 30

    humidity = telemetry.get("humidity", 85)
    if humidity < 70:
        base_score -= 15
    elif humidity > 98:
        base_score -= 10

    voc = telemetry.get("voc_level", 0)
    if voc > 500:
        base_score -= 25
    elif voc > 200:
        base_score -= 12

    ammonia = telemetry.get("ammonia_level", 0)
    if ammonia > 50:
        base_score -= 35
    elif ammonia > 25:
        base_score -= 20

    score = max(0.0, min(100.0, base_score))

    if score >= 75:
        risk = "low"
    elif score >= 50:
        risk = "medium"
    elif score >= 25:
        risk = "high"
    else:
        risk = "critical"

    return {"health_score": round(score, 2), "spoilage_risk": risk}

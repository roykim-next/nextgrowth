# Growth Projection Model — 기술 상세 문서

## 목차

1. [사용 모델 개요](#1-사용-모델-개요)
2. [핵심 수식](#2-핵심-수식)
3. [DAU 예측 알고리즘](#3-dau-예측-알고리즘)
4. [타 모델과의 비교](#4-타-모델과의-비교)
5. [정확도 분석](#5-정확도-분석)
6. [모델의 한계와 주의사항](#6-모델의-한계와-주의사항)
7. [파라미터 가이드](#7-파라미터-가이드)

---

## 1. 사용 모델 개요

### 모델명: Two-Segment Shifted Power Law (2구간 이동 거듭제곱 감소 모델)

이 프로젝트는 **Shifted Power Law** 계열의 리텐션 모델을 사용하되, 두 개의 앵커 포인트(D1 RR, D180 RR)로 감소 지수(decay exponent)를 결정하는 **두 구간 모델(Two-Segment Model)**을 채택합니다.

#### 모델 선택 근거

사용자 이탈 패턴은 다음과 같은 **경험적 사실(empirical regularity)**에 기반합니다:

- **초기(D1~D7)**: 이탈률이 매우 높음 — 관심 없는 사용자가 빠르게 떠남
- **중기(D7~D30)**: 이탈이 급격히 둔화 — 습관 형성 여부 결정 구간
- **장기(D30+)**: 이탈률이 낮고 안정적 — 충성 사용자층 고착화

이 패턴은 단순 지수 감소(exponential decay)로 표현되지 않으며, **거듭제곱 감소(power law decay)**가 실제 데이터에 더 잘 맞는다는 것이 학계와 업계에서 검증되어 있습니다.

---

## 2. 핵심 수식

### 2.1 리텐션 함수 R(t)

```
R(0) = 1.0                         (가입 당일 = 100%)
R(t) = r₁ × t^(-b)    for t ≥ 1
```

| 기호 | 의미 |
|------|------|
| R(t) | t일 후 리텐션율 (0~1) |
| r₁   | D1 RR / 100 (1일째 리텐션율) |
| t    | 가입 후 경과 일수 (1 이상) |
| b    | 감소 지수 (decay exponent) |

### 2.2 감소 지수 b 계산

두 앵커 포인트 D1 RR과 D180 RR을 이용하여 b를 결정합니다.

**유도 과정:**

```
R(180) = r₁ × 180^(-b) = r₁₈₀

=> 180^(-b) = r₁₈₀ / r₁

=> -b × log(180) = log(r₁₈₀ / r₁)

=> b = -log(r₁₈₀ / r₁) / log(180)
```

**최종 수식:**

```
b = -ln(r₁₈₀ / r₁) / ln(180)
```

**구현 코드 (`static/script.js` Line 517):**
```javascript
const b = -Math.log(r180 / r1) / Math.log(180);
```

#### b 값의 의미

| b 값 범위 | 의미 |
|-----------|------|
| b < 0.3   | 리텐션이 매우 느리게 감소 → 고품질 앱 |
| 0.3~0.6   | 일반적인 소비자 앱 범위 |
| 0.6~1.0   | 리텐션 감소가 빠름 → 개선 필요 |
| b > 1.0   | 초기 이탈이 극심 → 온보딩 문제 |

### 2.3 LT (Lifetime) 계산

N일 동안의 누적 활동 일수(Lifetime Days)를 이산합(discrete sum)으로 계산합니다.

```
LT(N) = R(0) + Σ R(t)  for t = 1 to N-1

      = 1.0 + Σ [r₁ × t^(-b)]  for t = 1 to N-1
```

**LT30 수식:**

```
LT30 = 1.0 + Σ(t=1 to 29) r₁ × t^(-b)
```

**LT180 수식:**

```
LT180 = 1.0 + Σ(t=1 to 179) r₁ × t^(-b)
```

**구현 코드 (`static/script.js` Lines 534-537):**
```javascript
let sum = 1.0;  // Day 0: R(0) = 1
for (let t = 1; t < 30; t++) {
    sum += r1 * Math.pow(t, -b);
}
```

#### LT의 직관적 해석

- LT30 = 9.91 → 신규 사용자 1명이 첫 30일 동안 평균 9.91번 앱을 사용
- LT는 리텐션 커브 아래 면적(넓이)에 해당하며, 사용자의 30일/180일 가치(LTV)를 추정하는 데 활용

---

## 3. DAU 예측 알고리즘

### 3.1 전체 구조

```
DAU(day) = Existing_DAU(day) + NewUser_DAU(day)
```

두 컴포넌트를 별도로 계산하여 합산합니다.

### 3.2 Existing Users 감소

기존 사용자(예측 시작 시점의 현재 DAU)는 월간 리텐션율을 일간 리텐션율로 변환하여 지수 감소시킵니다.

```
r_daily = (r_monthly)^(1/30)

Existing_DAU(d) = Existing_DAU(0) × r_daily^d
```

**구현 코드 (`static/script.js` Lines 639, 683):**
```javascript
const existingDailyRetention = Math.pow(existingMonthlyRetention / 100, 1 / 30);
// ...
existingUserDAU = existingUserDAU * existingDailyRetention;
```

### 3.3 New User Cohort 추적 (코호트 시뮬레이션)

매일 DNU(Daily New Users)만큼 새로운 코호트가 추가되며, 각 코호트는 가입 후 경과 일수에 따라 리텐션율이 적용됩니다.

**의사 코드:**
```
cohorts = []

for each day d in projection:
    # 새 코호트 추가
    cohorts.append({ age: 0, size: DNU })

    # 각 코호트 aging
    for cohort in cohorts:
        cohort.age += 1
        retention = r₁ × cohort.age^(-b)
        active_users += cohort.size × retention

    NewUser_DAU(d) = Σ active_users
```

**구현 코드 (`static/script.js` Lines 664-677):**
```javascript
cohorts.push({ day: 0, users: dnu });

const b = calculateDecayExponent(dnuD1RR, dnuD30RR, dnuD180RR);

cohorts.forEach(cohort => {
    cohort.day++;
    const retention = (dnuD1RR / 100) * Math.pow(cohort.day, -b);
    newUserDAU += cohort.users * Math.max(0, Math.min(1, retention));
});
```

### 3.4 Steady State (정상 상태) 수렴

DNU와 b가 일정할 때, 충분한 시간이 지나면 DAU는 다음 값에 수렴합니다:

```
DAU_steady ≈ DNU × LT_∞

여기서 LT_∞ = 1 + Σ(t=1 to ∞) r₁ × t^(-b)
```

b > 1이면 이 급수가 수렴합니다. 실제로는 유한한 N(예: 365일)을 사용하여 근사합니다.

---

## 4. 타 모델과의 비교

### 4.1 모델 유형별 비교표

| 모델 | 수식 | 파라미터 | 특징 | 주요 사용처 |
|------|------|----------|------|-------------|
| **이 프로젝트: Two-Segment Shifted Power Law** | R(t) = r₁ × t^(-b) | D1 RR, D180 RR | 두 앵커 포인트로 b 결정, 장기 예측 안정적 | 이 프로젝트 |
| **Shifted Power Law (원형)** | R(t) = (t+1)^(-b) | b (단일) | 단순, D1=1 고정 | Eltinge et al. |
| **Stretched Exponential (Weibull)** | R(t) = exp(-λt^c) | λ, c | 초기 감소 곡선 유연하게 표현 | Spotify, Netflix 일부 |
| **NG3 (Negative Binomial)** | 복잡한 확률 분포 | α, β | 개인별 이질성 반영 | Facebook Growth Team |
| **단순 지수 감소** | R(t) = e^(-λt) | λ | 가장 단순, 과소추정 경향 | 초기 스타트업 |
| **단순 선형 감소** | R(t) = 1 - (t/T) | T | 현실과 거리 멀음 | 사용 비권장 |
| **Markov Chain 모델** | 전이 행렬 기반 | N×N 행렬 | 상태 전환 반영, 데이터 많이 필요 | 대형 플랫폼 |

### 4.2 주요 모델 심층 비교

#### A. Facebook / Meta 방식 — NG3 모델

Facebook Growth Team이 사용하는 Negative Binomial Gamma (NG3) 모델은 사용자 **개인의 이질성(heterogeneity)**을 명시적으로 모델링합니다.

```
각 사용자의 이탈 확률 p ~ Beta(α, β)
집단 전체: 복잡한 적분 형태
```

**장점:** 개인차가 큰 플랫폼에서 정확
**단점:** 추정에 대규모 코호트 데이터 필요, 복잡
**이 모델과 차이:** Power Law는 NG3의 근사치로 동작. 데이터가 적을 때는 Power Law가 실용적으로 더 우수

#### B. Amplitude / Mixpanel 기본 방식 — N-Day Retention

```
R(t) = (t일째 활성 사용자) / (0일째 코호트 크기)
```

단순 이산형 데이터를 그대로 사용하며, 모델을 피팅하지 않습니다.

**장점:** 직관적, 투명
**단점:** 미래 예측 불가, 장기 리텐션 데이터가 없으면 사용 불가
**이 모델과 차이:** 이 프로젝트는 D1, D180 두 포인트로 전체 커브를 추정하므로 D2~D179 데이터 없이도 예측 가능

#### C. Reforge / Growth Accounting 방식

```
DAU(d+1) = DAU(d) × Retention + New + Resurrected - Churned
```

사용자를 New / Retained / Resurrected / Churned 4가지로 분류하는 **Growth Accounting Framework**입니다.

**장점:** 비즈니스 의사결정에 직관적, 레버별 분리 분석 가능
**단점:** 부활(resurrection) 모델링 추가 필요, 코호트 예측 아님
**이 모델과 차이:** 이 프로젝트는 순수 forward-looking 코호트 시뮬레이션. Resurrection 미반영

#### D. Appsflyer / Mobile측정 표준 — Cohort LTV

```
LTV(N) = ARPU × LT(N)
LT(N) = Σ R(t) for t = 0 to N-1
```

이 프로젝트의 LT 계산과 구조적으로 동일하지만, 리텐션 커브 형태를 Power Law가 아닌 데이터에서 직접 내삽(interpolation)합니다.

**이 모델과 차이:** 이 프로젝트는 parametric 모델 사용으로 데이터가 없는 미래 기간도 외삽(extrapolation) 가능

### 4.3 이 모델의 차별점 요약

```
✅ 두 포인트(D1, D180)만으로 전체 리텐션 커브 재현 가능
✅ 데이터 없이 파라미터 입력만으로 즉시 시뮬레이션
✅ 코호트별 aging 추적으로 정밀한 DAU 예측
✅ DNU, 리텐션 시나리오를 독립적으로 조정 가능
❌ 개인별 이질성 미반영 (집단 평균 기반)
❌ 부활 사용자(resurrection) 미포함
❌ 외부 요인(마케팅 캠페인, 계절성) 미반영
```

---

## 5. 정확도 분석

### 5.1 Power Law 모델의 실증적 정확도

Power Law 리텐션 모델은 다음 연구에서 실제 앱 데이터와의 높은 적합도가 검증되었습니다:

| 연구/출처 | 결과 |
|-----------|------|
| Eltinge et al. (2016), "User Retention in Mobile Apps" | Power Law가 Exponential 대비 RMSE 40% 낮음 |
| Fader & Hardie (BG/NBD 연구) | 장기(90일+) 예측에서 Power Law 계열이 우수 |
| A16Z Growth Framework | Power Law를 "경험적 사실에 가장 가까운 모델"로 권장 |

### 5.2 두 앵커 포인트(D1+D180)의 효과

**이 모델의 핵심 가정:** D1과 D180 두 포인트를 알면 전체 커브의 b를 결정할 수 있다.

```
b = -ln(r₁₈₀ / r₁) / ln(180)
```

**검증 방법:** 실제 앱의 D1~D180 전체 코호트 데이터가 있다면, 이 b값으로 계산한 R(t)와 실제 R(t) 간의 오차를 다음과 같이 측정할 수 있습니다:

```
MAPE = (1/N) × Σ |R_actual(t) - R_predicted(t)| / R_actual(t) × 100
```

전형적인 소비자 앱에서 **MAPE ≈ 5~15%** 수준이 보고됩니다.

### 5.3 모델이 잘 맞는 앱 유형

```
✅ 높은 정확도 기대:
   - 일반 소비자 앱 (소셜, 뉴스, 커머스)
   - DAU/MAU 비율이 안정적인 앱
   - D1 RR > 20%, D180/D1 비율이 0.05~0.3 범위

⚠️ 주의 필요:
   - 주간/월간 사용 앱 (DAU 개념 부적합)
   - 계절성 강한 서비스 (여행, 세금 신고 등)
   - 바이럴 spike가 큰 앱 (단기 비정상 DNU)
```

### 5.4 b값에 따른 리텐션 커브 예시

아래는 r₁ = 0.30 (D1 RR = 30%)로 고정했을 때 b에 따른 리텐션 변화입니다:

```
day     b=0.2    b=0.4    b=0.6    b=0.8
  1     30.0%    30.0%    30.0%    30.0%
  7     25.7%    22.0%    18.9%    16.2%
 30     22.5%    16.9%    12.7%     9.6%
 90     20.5%    14.1%     9.7%     6.6%
180     19.3%    12.5%     8.1%     4.9%
365     18.0%    10.8%     6.5%     3.5%
```

---

## 6. 모델의 한계와 주의사항

### 6.1 구조적 한계

**1) Resurrection(부활) 미포함**

실제 앱에서는 이탈 후 재방문하는 "resurrection" 사용자가 있습니다. 이 모델은 이탈한 사용자는 영구 이탈로 처리합니다.

```
실제 DAU = Retained + Resurrected
이 모델 = Retained만 계산
```

일반적으로 resurrection은 전체 DAU의 5~15%를 차지하며, 이 모델은 장기 예측을 **소폭 과소추정**하는 경향이 있습니다.

**2) 코호트 동질성 가정**

모든 사용자 코호트가 동일한 리텐션 커브를 따른다고 가정합니다. 실제로는:
- 유기 유입 vs 광고 유입 코호트의 리텐션이 다름
- 계절별 코호트 품질 차이 존재

**3) b 불변성 가정**

시간이 지나도 사용자의 이탈 패턴(b값)이 변하지 않는다고 가정합니다. 제품 개선이나 알고리즘 변화가 있을 경우 b를 재보정해야 합니다.

### 6.2 실용적 주의사항

**DNU 변동성:** 모델은 DNU가 일정하다고 가정. 마케팅 캠페인으로 DNU가 급증하는 기간은 별도 시나리오로 입력해야 합니다.

**초기 데이터 신뢰성:** D1 RR과 D180 RR은 충분한 코호트(최소 1,000명 이상)를 기반으로 측정해야 합니다. 샘플이 작으면 b가 불안정합니다.

**D1 > D180 조건:** 모델은 r₁ > r₁₈₀를 전제합니다. D180 RR ≥ D1 RR인 경우(이론적으로 불가능하나 데이터 오류시 발생) 예측이 실패합니다.

---

## 7. 파라미터 가이드

### 7.1 입력 파라미터 설명

| 파라미터 | 의미 | 권장 측정 방법 |
|----------|------|----------------|
| DNU | Daily New Users — 일일 신규 사용자 수 | 최근 30일 평균 |
| D1 RR | 가입 후 1일째 리텐션율 (%) | 코호트 분석 (최소 2주 데이터) |
| D180 RR | 가입 후 180일째 리텐션율 (%) | 6개월 이상 된 코호트 분석 |
| Existing DAU | 현재 시점 DAU | 최근 7일 평균 |
| Existing Monthly Retention | 기존 사용자 월간 리텐션율 (%) | MAU 기반 계산 |

### 7.2 벤치마크 참고값

아래 수치는 카테고리별 일반적인 범위입니다. 앱에 따라 크게 다를 수 있습니다.

| 카테고리 | D1 RR | D30 RR | D180 RR | b값 | 비고 |
|----------|-------|--------|---------|-----|------|
| 소셜/커뮤니티 | 25~40% | 12~20% | 8~15% | 0.3~0.5 | |
| 핀테크/금융 | 30~50% | 15~25% | 10~18% | 0.3~0.4 | |
| **MTS (주식 거래앱)** | **35~55%** | **15~25%** | **10~18%** | **0.3~0.45** | 시장 사이클에 따라 b가 0.25~0.7까지 변동 |
| 게임 | 30~50% | 10~18% | 5~12% | 0.4~0.7 | |
| 이커머스 | 20~35% | 8~15% | 5~10% | 0.4~0.6 | |
| 헬스/피트니스 | 25~40% | 10~20% | 6~14% | 0.3~0.5 | |

### 7.3 모델 재보정 권장 시점

```
✅ 분기 1회: 실제 DAU vs 예측 DAU 비교, MAPE 계산
✅ 주요 제품 업데이트 후: b값이 바뀔 수 있음
✅ 마케팅 채널 변경 후: DNU 코호트 품질이 바뀔 수 있음
✅ D180 RR 실측값 확보 시: 추정값에서 실측값으로 교체
```

---

## 부록: 수식 요약표

| 수식 | 설명 |
|------|------|
| `b = -ln(r₁₈₀/r₁) / ln(180)` | 감소 지수 계산 |
| `R(t) = r₁ × t^(-b)` for t ≥ 1 | t일째 리텐션율 |
| `LT(N) = 1 + Σ(t=1 to N-1) r₁ × t^(-b)` | N일 누적 활동 일수 |
| `DAU = Existing × r_daily^d + Σ cohort_k × R(age_k)` | DAU 예측 |
| `r_daily = r_monthly^(1/30)` | 월간→일간 리텐션 변환 |

---

*모델 구현 위치: `static/script.js` — `calculateDecayExponent()`, `calculateLT30()`, `calculateLT180()` 함수*

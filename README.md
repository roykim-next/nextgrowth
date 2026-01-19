# Growth Projection - DAU 예측 도구

Flask 기반의 DAU(Daily Active Users) 성장 예측 도구입니다.

## 로컬 실행

```bash
# 의존성 설치
pip3 install -r requirements.txt

# 데이터베이스 초기화 (SQLite)
python3 init_db.py

# 서버 실행
python3 app.py
```

서버는 http://localhost:8085 에서 실행됩니다.

## Vercel 배포

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `schema.sql` 파일의 내용 실행
3. Supabase URL과 Key 확인

### 2. GitHub에 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 3. Vercel에서 배포

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "Add New Project" 클릭
3. GitHub 저장소 선택
4. Environment Variables 설정:
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_KEY`: Supabase anon key
   - `FLASK_SECRET_KEY`: 랜덤 시크릿 키
5. "Deploy" 클릭

배포가 완료되면 `https://growth-projection.vercel.app`에서 접속할 수 있습니다.

## 기본 계정

- Email: `henry@nextsecurities.com`
- Password: `admin123`

## 기능

- DAU 성장 예측
- 코호트 분석
- 리텐션 커브 기반 계산
- 사용자 관리 및 승인 시스템

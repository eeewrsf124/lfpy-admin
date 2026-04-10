# LFPY Admin Dashboard

**Let's find the place you want.** — 고등학교 AI 추천 서비스 관리자 대시보드

## 파일 구성

| 파일 | 설명 |
|---|---|
| `admin.html` | 실시간 관리자 대시보드 |
| `tracker.js` | 사용자 행동 추적 모듈 |

## 시작하기

### 1. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 새 프로젝트 생성
3. **Realtime Database** → 테스트 모드로 생성
4. 보안 규칙 설정:

```json
{
  "rules": {
    ".read": false,
    ".write": true,
    "sessions": { ".read": true, ".write": true },
    "stats": { ".read": true, ".write": true }
  }
}
```

### 2. tracker.js 설정

`tracker.js` 파일의 `FB_URL`을 본인 Firebase URL로 교체:

```js
const FB_URL = 'https://your-project-default-rtdb.firebaseio.com';
```

### 3. index.html에 tracker.js 추가

```html
<!-- </body> 바로 앞에 추가 -->
<script src="tracker.js"></script>
```

### 4. 관리자 로그인

`admin.html` 최초 접속 후 **설정 탭**에서 ID/PW 설정

## 추적 데이터

- 실시간 접속자 현황
- 설문 질문별 응답 내용
- 학교 조회 / 저장 기록
- 기기, 브라우저, 유입 경로
- 체류 시간

## 공공데이터 출처

- 경기도 고등학교 현황: 교육부 / 나이스 (open.neis.go.kr) — 공공누리 1유형
- 사교육비 통계: 통계청 (kostat.go.kr)

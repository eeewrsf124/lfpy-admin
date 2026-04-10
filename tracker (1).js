// =====================================================
// LFPY Tracker - 사용자 행동 실시간 추적 모듈
// index.html 상단에 <script src="tracker.js"></script> 추가
// =====================================================

(function(){
  // ===== Firebase 설정 (본인 프로젝트로 교체) =====
  const FB_URL = 'https://실제URL.firebaseio.com'; // ← 본인 Firebase URL로 교체

  // ===== 세션 생성 =====
  const SESSION_ID = 'S' + Date.now() + Math.random().toString(36).substr(2,6).toUpperCase();
  const SESSION_START = Date.now();

  // 기기 감지
  function getDevice(){
    const ua=navigator.userAgent;
    if(/tablet|ipad/i.test(ua))return '태블릿';
    if(/mobile|android|iphone/i.test(ua))return '모바일';
    return '데스크탑';
  }

  // OS 감지
  function getOS(){
    const ua=navigator.userAgent;
    if(/windows/i.test(ua))return 'Windows';
    if(/mac/i.test(ua))return 'macOS';
    if(/android/i.test(ua))return 'Android';
    if(/iphone|ipad/i.test(ua))return 'iOS';
    return '기타';
  }

  // 브라우저 감지
  function getBrowser(){
    const ua=navigator.userAgent;
    if(/chrome/i.test(ua)&&!/edg/i.test(ua))return 'Chrome';
    if(/safari/i.test(ua)&&!/chrome/i.test(ua))return 'Safari';
    if(/firefox/i.test(ua))return 'Firefox';
    if(/edg/i.test(ua))return 'Edge';
    if(/samsung/i.test(ua))return 'Samsung';
    return '기타';
  }

  // 유입 경로
  function getSource(){
    const ref=document.referrer;
    if(!ref)return '직접 접속';
    if(/naver/i.test(ref))return '네이버';
    if(/google/i.test(ref))return '구글';
    if(/kakao/i.test(ref))return '카카오';
    if(/twitter|x\.com/i.test(ref))return '트위터';
    if(/instagram/i.test(ref))return '인스타그램';
    return '기타';
  }

  // ===== Firebase REST API 호출 =====
  function fbSet(path, data){
    fetch(FB_URL+'/'+path+'.json',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    }).catch(()=>{});
  }

  function fbPatch(path, data){
    fetch(FB_URL+'/'+path+'.json',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    }).catch(()=>{});
  }

  function fbPush(path, data){
    fetch(FB_URL+'/'+path+'.json',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    }).catch(()=>{});
  }

  function fbDelete(path){
    fetch(FB_URL+'/'+path+'.json',{method:'DELETE'}).catch(()=>{});
  }

  // ===== 세션 초기화 =====
  const sessionData = {
    id: SESSION_ID,
    startTime: new Date().toISOString(),
    startTs: SESSION_START,
    device: getDevice(),
    os: getOS(),
    browser: getBrowser(),
    source: getSource(),
    screenW: window.innerWidth,
    screenH: window.innerHeight,
    lang: navigator.language||'ko',
    currentPage: '홈',
    quizAnswers: {},
    quizStep: 0,
    events: [],
    lastActive: Date.now(),
    isActive: true,
    completedQuiz: false,
    viewedSchools: [],
    savedSchools: [],
    usedServices: [],
  };

  // 세션 등록
  fbSet('sessions/'+SESSION_ID, sessionData);

  // 통계 업데이트 (오늘 방문자 수)
  const today = new Date().toISOString().split('T')[0];
  fetch(FB_URL+'/stats/daily/'+today+'/visitors.json')
    .then(r=>r.json())
    .then(v=>{fbSet('stats/daily/'+today+'/visitors',(v||0)+1);})
    .catch(()=>{fbSet('stats/daily/'+today+'/visitors',1);});

  // ===== heartbeat (5초마다 활성 상태 갱신) =====
  const heartbeat = setInterval(()=>{
    fbPatch('sessions/'+SESSION_ID,{
      lastActive: Date.now(),
      duration: Math.round((Date.now()-SESSION_START)/1000),
      isActive: true,
    });
  }, 5000);

  // ===== 이벤트 로그 =====
  function logEvent(type, data){
    const event = {
      type, data,
      ts: Date.now(),
      time: new Date().toLocaleTimeString('ko'),
    };
    fbPush('sessions/'+SESSION_ID+'/events', event);
    fbPatch('sessions/'+SESSION_ID,{lastActive:Date.now(),currentPage:data.page||sessionData.currentPage});
  }

  // ===== 페이지 추적 =====
  window.LFPY_TRACK = {

    // 페이지 전환
    page: function(pageName){
      sessionData.currentPage = pageName;
      fbPatch('sessions/'+SESSION_ID,{currentPage:pageName,lastActive:Date.now()});
      logEvent('page_view',{page:pageName});
    },

    // 설문 답변 추적
    quiz: function(questionId, questionText, answers, step){
      sessionData.quizAnswers[questionId] = {
        question: questionText,
        answers: Array.isArray(answers)?answers:[answers],
        step: step,
        ts: new Date().toLocaleTimeString('ko'),
      };
      sessionData.quizStep = step;
      fbPatch('sessions/'+SESSION_ID,{
        quizAnswers: sessionData.quizAnswers,
        quizStep: step,
        lastActive: Date.now(),
      });
      logEvent('quiz_answer',{
        page:'추천받기 Q'+step,
        questionId, questionText,
        answers: Array.isArray(answers)?answers:[answers],
        step,
      });
    },

    // 설문 완료
    quizComplete: function(recommendedSchools){
      fbPatch('sessions/'+SESSION_ID,{
        completedQuiz: true,
        recommendedSchools: recommendedSchools||[],
        quizEndTs: Date.now(),
      });
      logEvent('quiz_complete',{
        page:'결과 확인',
        schools: recommendedSchools||[],
      });
      // 완료 통계
      fetch(FB_URL+'/stats/daily/'+today+'/completions.json')
        .then(r=>r.json())
        .then(v=>fbSet('stats/daily/'+today+'/completions',(v||0)+1))
        .catch(()=>fbSet('stats/daily/'+today+'/completions',1));
    },

    // 학교 조회
    viewSchool: function(schoolName, schoolType){
      if(!sessionData.viewedSchools.includes(schoolName)){
        sessionData.viewedSchools.push(schoolName);
        fbPatch('sessions/'+SESSION_ID,{viewedSchools:sessionData.viewedSchools});
      }
      logEvent('school_view',{page:'학교 상세',school:schoolName,type:schoolType});
    },

    // 학교 저장
    saveSchool: function(schoolName){
      if(!sessionData.savedSchools.includes(schoolName)){
        sessionData.savedSchools.push(schoolName);
        fbPatch('sessions/'+SESSION_ID,{savedSchools:sessionData.savedSchools});
      }
      logEvent('school_save',{page:'학교 저장',school:schoolName});
    },

    // 서비스 이용
    useService: function(serviceName){
      if(!sessionData.usedServices.includes(serviceName)){
        sessionData.usedServices.push(serviceName);
        fbPatch('sessions/'+SESSION_ID,{usedServices:sessionData.usedServices});
      }
      logEvent('service_use',{page:serviceName,service:serviceName});
    },

    // 검색
    search: function(query){
      logEvent('search',{page:'학교 검색',query});
    },
  };

  // ===== 페이지 이탈 처리 =====
  function onLeave(){
    fbPatch('sessions/'+SESSION_ID,{
      isActive: false,
      endTime: new Date().toISOString(),
      duration: Math.round((Date.now()-SESSION_START)/1000),
    });
    clearInterval(heartbeat);
  }

  window.addEventListener('beforeunload', onLeave);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      fbPatch('sessions/'+SESSION_ID,{isActive:false,lastActive:Date.now()});
    } else {
      fbPatch('sessions/'+SESSION_ID,{isActive:true,lastActive:Date.now()});
    }
  });

  // ===== 자동 페이지 감지 (switchTab 연동) =====
  const _origSwitchTab = window.switchTab;
  if(typeof window.switchTab === 'function'){
    window.switchTab = function(tab){
      const pageNames={
        home:'홈',quiz:'추천받기',result:'결과 확인',search:'학교 검색',
        activity:'내 학습',career:'진로 테스트',study:'학습 플랜',
        strategy:'입시 전략',compare:'학교 비교',cost:'사교육비',
        schedule:'입학 일정',detail:'학교 상세',
      };
      if(window.LFPY_TRACK) window.LFPY_TRACK.page(pageNames[tab]||tab);
      return _origSwitchTab(tab);
    };
  }

  console.log('[LFPY Tracker] 세션 시작:', SESSION_ID);
})();

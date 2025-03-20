import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";

// 지원하는 언어 타입
export type Language = "en" | "ko";

// 언어 컨텍스트 타입
type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

// 번역 데이터
const translations: Record<Language, Record<string, string>> = {
  en: {
    // 공통
    "app.name": "Knowledge Manager",
    "app.logout": "Logout",
    "app.settings": "Settings",
    
    // 사이드바
    "sidebar.dashboard": "Dashboard",
    "sidebar.documents": "Documents",
    "sidebar.semantic": "Semantic Network",
    "sidebar.ontology": "Ontology",
    "sidebar.recommendations": "Recommendations",
    
    // 인증
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.username": "Username",
    "auth.loginTitle": "Welcome Back",
    "auth.loginSubtitle": "Enter your credentials to access your account",
    "auth.registerTitle": "Create an Account",
    "auth.registerSubtitle": "Enter your details to create a new account",
    "auth.heroTitle": "Knowledge Management",
    "auth.heroSubtitle": "Organize your documents, discover connections, and get personalized recommendations",
    
    // 대시보드
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.createDocument": "Create Document",
    "dashboard.uploadDocument": "Upload Document",
    "dashboard.createOntology": "Create Ontology",
    "dashboard.recentDocuments": "Recent Documents",
    "dashboard.noDocuments": "No recent documents found",
    "dashboard.recommendations": "Recommendations",
    "dashboard.noRecommendations": "No recommendations available",
    "dashboard.priorities": "Priorities",
    "dashboard.addPriority": "Add Priority",
    "dashboard.noPriorities": "No priorities found",
    "dashboard.topTags": "Top Tags",
    "dashboard.noTags": "No tags found",
    
    // 문서
    "documents.title": "Documents",
    "documents.upload": "Upload Document",
    "documents.create": "Create Document",
    "documents.search": "Search documents...",
    "documents.noDocuments": "No documents found",
    "documents.name": "Name",
    "documents.type": "Type",
    "documents.created": "Created",
    "documents.actions": "Actions",
    
    // 문서 상세
    "document.title": "Title",
    "document.content": "Content",
    "document.summary": "Summary",
    "document.tags": "Tags",
    "document.save": "Save",
    "document.delete": "Delete",
    "document.back": "Back to Documents",
    
    // 시맨틱 네트워크
    "semantic.title": "Semantic Network",
    "semantic.description": "Visualize connections between your documents",
    "semantic.noData": "No semantic connections found",
    
    // 온톨로지
    "ontology.title": "Ontology Management",
    "ontology.subtitle": "Manage knowledge structure and relationships",
    "ontology.create": "Create Ontology",
    "ontology.edit": "Edit",
    "ontology.delete": "Delete",
    "ontology.name": "Name",
    "ontology.description": "Description",
    "ontology.save": "Save",
    "ontology.cancel": "Cancel",
    "ontology.noOntologies": "No ontologies found",
    
    // 추천
    "recommendations.title": "Recommendations",
    "recommendations.description": "Personalized recommendations based on your activity",
    "recommendations.noRecommendations": "No recommendations available",
    
    // 설정
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.save": "Save Settings"
  },
  ko: {
    // 공통
    "app.name": "지식 관리자",
    "app.logout": "로그아웃",
    "app.settings": "설정",
    
    // 사이드바
    "sidebar.dashboard": "대시보드",
    "sidebar.documents": "문서",
    "sidebar.semantic": "의미 네트워크",
    "sidebar.ontology": "온톨로지",
    "sidebar.recommendations": "추천",
    
    // 인증
    "auth.login": "로그인",
    "auth.register": "회원가입",
    "auth.email": "이메일",
    "auth.password": "비밀번호",
    "auth.username": "사용자 이름",
    "auth.loginTitle": "돌아오신 것을 환영합니다",
    "auth.loginSubtitle": "계정에 접속하려면 로그인 정보를 입력하세요",
    "auth.registerTitle": "계정 만들기",
    "auth.registerSubtitle": "새 계정을 만들려면 정보를 입력하세요",
    "auth.heroTitle": "지식 관리 시스템",
    "auth.heroSubtitle": "문서를 정리하고, 연결을 발견하고, 맞춤형 추천을 받으세요",
    
    // 대시보드
    "dashboard.title": "대시보드",
    "dashboard.welcome": "환영합니다",
    "dashboard.quickActions": "빠른 작업",
    "dashboard.createDocument": "문서 생성",
    "dashboard.uploadDocument": "문서 업로드",
    "dashboard.createOntology": "온톨로지 생성",
    "dashboard.recentDocuments": "최근 문서",
    "dashboard.noDocuments": "최근 문서가 없습니다",
    "dashboard.recommendations": "추천",
    "dashboard.noRecommendations": "사용 가능한 추천이 없습니다",
    "dashboard.priorities": "우선순위",
    "dashboard.addPriority": "우선순위 추가",
    "dashboard.noPriorities": "우선순위가 없습니다",
    "dashboard.topTags": "인기 태그",
    "dashboard.noTags": "태그가 없습니다",
    
    // 문서
    "documents.title": "문서",
    "documents.upload": "문서 업로드",
    "documents.create": "문서 생성",
    "documents.search": "문서 검색...",
    "documents.noDocuments": "문서가 없습니다",
    "documents.name": "이름",
    "documents.type": "유형",
    "documents.created": "생성일",
    "documents.actions": "작업",
    
    // 문서 상세
    "document.title": "제목",
    "document.content": "내용",
    "document.summary": "요약",
    "document.tags": "태그",
    "document.save": "저장",
    "document.delete": "삭제",
    "document.back": "문서 목록으로 돌아가기",
    
    // 시맨틱 네트워크
    "semantic.title": "의미 네트워크",
    "semantic.description": "문서 간 연결 시각화",
    "semantic.noData": "의미 연결이 없습니다",
    
    // 온톨로지
    "ontology.title": "온톨로지 관리",
    "ontology.subtitle": "지식 구조 및 관계 관리",
    "ontology.create": "온톨로지 생성",
    "ontology.edit": "편집",
    "ontology.delete": "삭제",
    "ontology.name": "이름",
    "ontology.desc": "설명",
    "ontology.save": "저장",
    "ontology.cancel": "취소",
    "ontology.noOntologies": "온톨로지가 없습니다",
    
    // 추천
    "recommendations.title": "추천",
    "recommendations.description": "활동 기반 맞춤형 추천",
    "recommendations.noRecommendations": "사용 가능한 추천이 없습니다",
    
    // 설정
    "settings.title": "설정",
    "settings.language": "언어",
    "settings.theme": "테마",
    "settings.save": "설정 저장"
  }
};

// 언어 컨텍스트 생성
const LanguageContext = createContext<LanguageContextType | null>(null);

// 언어 제공자 컴포넌트
export function LanguageProvider({ children }: { children: ReactNode }) {
  // 로컬 스토리지에서 저장된 언어 가져오기 또는 기본 언어(영어) 사용
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    return savedLanguage && (savedLanguage === "en" || savedLanguage === "ko") 
      ? savedLanguage 
      : "en";
  });

  // 언어 변경 시 로컬 스토리지에 저장
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("language", newLanguage);
  };

  // 번역 함수
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // 언어 변경 시 HTML 언어 속성 업데이트
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// 언어 훅
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
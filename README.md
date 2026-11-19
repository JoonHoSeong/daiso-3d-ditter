# Daiso 3D Drawer Fitter (다이소 서랍 정리 3D 피터)

> **내 방 서랍 치수를 입력하면, 다이소 수납함을 3D로 테트리스처럼 꼭 맞게 피팅해 주는 스마트 정리 솔루션**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React_18_%7C_Three.js_%7C_Tailwind-61DAFB.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Python_3.12_%7C_FastAPI-009688.svg)]()

---

## 📌 프로젝트 소개

**다이소 서랍 3D 피터(Daiso 3D Drawer Fitter)**는 사용자가 보유한 서랍의 가로(W), 세로(D), 깊이(H) 치수를 입력하면, 다이소에서 판매하는 다양한 규격의 정리함(트레이, 바구니, 칸막이함)을 공간 낭비 없이 꽉 채워주는 **3D 공간 최적화 & 견적 산출 웹 애플리케이션**입니다.

### ✨ 주요 특징
1. **정밀 3D 서랍 뷰어 (Three.js)**
   * 서랍 내부 치수와 정확히 일치하는 2cm 눈금 격자 가이드 렌더링
   * 반투명 아크릴(Polypropylene) 질감의 다이소 수납함 3D 시각화
   * 자유로운 3D 궤도 회전(Orbit), 휠 줌, **2D 평면도(Top-down) 및 정면(Front) 뷰 원클릭 전환**
   * 트레이 클릭을 통한 **90도 회전 및 개별 삭제 인터랙션**
2. **테트리스형 스마트 자동 피팅 (2D Best-Fit Descending)**
   * 공간 여백(Waste)을 최소화하도록 큰 트레이부터 작은 미니 트레이까지 빈틈없이 테트리스처럼 배치 (공간 채움률 80%~100% 달성)
3. **다이소 매장 쇼핑 지원 (품번 1-클릭 복사)**
   * 배치 완료 시 품목 리스트(BOM), 단가, 총 구매 금액 산출
   * 다이소 오프라인 매장 방문 시 직원에게 문의하거나 재고를 조회할 수 있는 **8자리 고유 품번(SKU) 텍스트 일괄 복사 기능**
4. **실시간 & 주기적 자동 갱신 파이프라인 (Auto Scheduler & Manual Sync)**
   * **주기적 크론 스케줄러**: APScheduler를 통해 매주 일요일 새벽 다이소몰 신상품을 자동 크롤링 및 규격 파싱 갱신
   * **원클릭 수동 갱신**: 프론트엔드 헤더의 `[다이소 갱신]` 버튼 또는 백엔드 `POST /api/scraper/sync` API를 통해 언제든 최신 데이터로 동기화
5. **치수 자동 파서 및 대규모 수납함 카탈로그 (Python)**
   * 다이소몰의 비정형 텍스트(`약 16x24x4.5cm`, `150*200*50mm` 등)를 cm 단위로 정제하는 정규식 치수 파서 내장
   * 서랍 트레이, 팬트리 바구니, 칸막이함, 다용도 보관함, 리빙박스, 캠핑 폴딩박스 등 80종 이상 실시간 데이터베이스 제공

---

## ⚖️ 법적 고지 및 라이센스 (Legal Disclaimer)

* **비공식 프로젝트 안내**: 본 프로젝트는 개인 연구 및 오픈소스 목적으로 제작된 **비공식(Unofficial) 팬 메이드 프로젝트**이며, (주)아성다이소와 공식적인 제휴 및 보증 관계가 없습니다.
* **데이터 저작권 준수**:
  - 본 프로그램에서 취급하는 상품의 치수(가로/세로/높이), 규격, 품번, 가격은 저작권법의 보호 대상이 아닌 **순수 사실 정보(Factual Data)**에 해당합니다.
  - 다이소몰의 상품 사진 및 상세페이지 이미지는 자체 서버에 저장하거나 재배포하지 않으며, 치수 기반의 3D 절차적 메시(Procedural Mesh)로 시각화하고 공식 다이소몰 원본 페이지로 아웃링크(External Link)를 제공합니다.
* **소프트웨어 라이선스**: 본 저장소의 코드는 [Apache License 2.0](LICENSE) 라이선스 하에 자유롭게 이용 및 수정이 가능합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

### Frontend
* **Core**: React 18, TypeScript, Vite
* **3D Graphics**: Three.js (`WebGLRenderer`, `MeshPhysicalMaterial`, `Raycaster`)
* **Styling**: Tailwind CSS, Lucide React
* **UI/UX Design**: Google Stitch Design System (`Modular Precision Grid`)
* **Verification**: Playwright MCP (브라우저 인터랙션 및 뷰포트 자동 검증)

### Backend
* **Core**: Python 3.12+, FastAPI, Uvicorn
* **Data Validation**: Pydantic v2
* **Scraper & Parser**: HTTPX, BeautifulSoup4, Custom Regex Dimension Parser
* **Testing**: FastAPI TestClient

---

## 📁 프로젝트 구조 (Directory Structure)

```
daiso-3d-fitter/
├── frontend/                     # React + Three.js 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── DrawerCanvas3D.tsx    # Three.js 3D 서랍 및 트레이 렌더러
│   │   │   ├── ProductCatalog.tsx    # 다이소 수납함 목록 & 카테고리 필터
│   │   │   ├── FittedInspector.tsx   # 공간 활용도, 쇼핑 견적 및 품번 복사 패널
│   │   │   └── HeaderNav.tsx         # 서랍 치수 조절 바 & 프리셋 선택기
│   │   ├── data/
│   │   │   └── daisoProducts.ts      # 프론트엔드 수납함 규격 및 프리셋
│   │   ├── utils/
│   │   │   └── fitterAlgorithm.ts    # 2D 최적 공간 패킹 알고리즘
│   │   ├── App.tsx                   # 메인 워크벤치 레이아웃
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/                      # Python FastAPI 백엔드
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py             # 상품 목록, 최적 배치 연산 API
│   │   ├── algorithms/
│   │   │   └── packer.py             # 서버 사이드 2D/3D 패킹 엔진
│   │   ├── scraper/
│   │   │   ├── parser.py             # 비정형 치수 텍스트 정규식 파서
│   │   │   └── daiso_scraper.py      # Rate-limiting 다이소몰 크롤러
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic 스키마 정의
│   │   └── main.py                   # FastAPI 엔트리포인트 (CORS 설정)
│   ├── data/
│   │   └── daiso_organizers.json     # 정제된 다이소 수납함 데이터
│   ├── requirements.txt
│   └── test_backend.py               # 백엔드 단위 테스트 스위트
│
├── .gitignore
├── LICENSE                       # Apache-2.0
└── README.md
```

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. 프론트엔드 실행 (Frontend)

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행 (포트 5173)
npm run dev
```
브라우저에서 `http://localhost:5173`으로 접속합니다.

### 2. 백엔드 실행 (Backend)

```bash
cd backend

# Python 3.12 가상환경 생성 및 활성화
python3.12 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 단위 테스트 실행
python test_backend.py

# FastAPI 서버 실행 (포트 8000)
uvicorn app.main:app --reload --port 8000
```
Swagger API 문서는 `http://localhost:8000/docs`에서 확인하실 수 있습니다.

---

## 📋 사용 방법

1. **상단 서랍 치수 입력**: 가로(W), 세로(D), 깊이(H)를 cm 단위로 입력하거나 드롭다운에서 표준 프리셋(책상 서랍, 싱크대 서랍 등)을 선택합니다.
2. **자동 최적 피팅**: 상단의 **[✨ 자동 최적 피팅]** 버튼을 클릭하면 빈틈없이 꼭 맞는 수납함 조합이 자동으로 3D 서랍 안에 배치됩니다.
3. **수동 커스텀 배치**: 좌측 카탈로그에서 원하는 트레이의 **[+ 서랍에 담기]**를 눌러 직접 추가하고, 3D 화면에서 트레이를 클릭하여 90도 회전하거나 삭제할 수 있습니다.
4. **매장 방문용 품번 복사**: 우측 하단의 **[매장용 품번 목록 복사하기]**를 눌러 스마트폰 메모장에 붙여넣고 다이소 매장을 방문하세요!

## ⏰ 자동 제품 업데이트 (CRON)

다이소몰 상품 데이터를 주기적으로 재동기화하여 최신 라인업으로 유지하는 기능입니다.

### 동작 방식

```
OS 스케줄러 (매일 06:00)
[macOS launchd / Linux crontab]
        |
        v
cron_exec.sh   (중복 실행 방지 잠금, 30분 stale 체크)
        |
        v
cron_update.py
        |
        +--- sync_to_frontend.py 실행
        |       backend/data/daiso_organizers.json
        |           -> frontend/src/data/daisoProducts.json
        +--- sync_meta.json 최종 실행 결과 기록
```

### 설정 방법

macOS 최신 버전은 crontab이 비활성이므로 launchd(LaunchAgents)로 자동 등록합니다.
Linux는 기존 crontab 로직을 사용합니다.

```bash
cd daiso-3d-fitter

# 1. CRON 등록 (매일 오전 6시 자동 실행)
bash backend/install_cron.sh install

# 2. 등록 상태 확인
bash backend/install_cron.sh list

# 3. 지금 바로 실행해 테스트
bash backend/install_cron.sh run-now

# 4. 등록 해제
bash backend/install_cron.sh uninstall
```

### 실행 결과 확인

- **실행 로그**: `backend/data/cron.log`
- **동기화 상태**: `backend/data/sync_meta.json` (최종 실행 시각, 동기화 상품 수)

> **TIP**: 크론 등록 전, 먼저 `run-now`로 1회 수동 실행하여
> 정상 동기화가 되는지 확인하시는 것을 권장합니다.

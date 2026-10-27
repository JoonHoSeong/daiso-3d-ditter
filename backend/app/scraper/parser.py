import html
import re
from typing import Optional, Tuple

class DimensionParser:
    """
    Unified, high-precision parser & normalizer for extracting Width (W), Depth (D), and Height (H) in cm
    from Daiso product titles, official specs (vsipPdDtl / pdDtlDc), and product categories.
    """

    # Reject numbers followed by non-dimension units (g, ml, l, 개, 매, p, m[meter], 호, 칸, 구, 단, V, W)
    NON_DIM_UNIT_AHEAD = r'(?!\s*(?:g|kg|ml|l|리터|매|개|입|p|단|구|칸|호|v|w|m(?![mM]))\b)'

    # 1. 3D multiplication pattern (supports optional per-number cm/mm or trailing cm/mm)
    DIM_3D_REGEX = re.compile(
        r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?\s*(?:\([가-힣a-zA-Z]+\)\s*)?[\*xX×]\s*'
        r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?\s*(?:\([가-힣a-zA-Z]+\)\s*)?[\*xX×]\s*'
        r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?' + NON_DIM_UNIT_AHEAD,
        re.IGNORECASE
    )

    # 2. 2D multiplication pattern with explicit cm/mm unit required on at least one dimension
    DIM_2D_EXPLICIT_REGEX = re.compile(
        r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?\s*(?:\([가-힣a-zA-Z]+\)\s*)?[\*xX×]\s*'
        r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)' + NON_DIM_UNIT_AHEAD,
        re.IGNORECASE
    )

    # 3. Roll pattern: e.g. 30 cm * 20 m or 16cmX10m
    ROLL_METER_REGEX = re.compile(
        r'([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)\s*[\*xX×]\s*([0-9]+(?:\.[0-9]+)?)\s*m\b',
        re.IGNORECASE
    )

    # 4. Circular / diameter pattern: 지름 23.5cm / 지름 13~15cm / 약 31 mm 지름 / 원형 트레이 30 cm
    CIRCULAR_REGEX = re.compile(
        r'(?:(?:원형|회전|지름|직경|턴테이블)[^0-9\n]{0,15}(?:[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm)?\s*~\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)'
        r'|(?:약\s*)?(?:[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm)?\s*~\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)\s*[\(\[]?\s*(?:지름|직경)\s*[\)\]]?)',
        re.IGNORECASE
    )

    @classmethod
    def _to_cm(cls, val: float, unit: Optional[str], default_unit: str = 'cm') -> float:
        u = (unit or default_unit).lower().strip()
        if u == 'mm':
            return val / 10.0
        return val

    @classmethod
    def parse_explicit_dims(cls, text: str) -> Optional[Tuple[float, float, float]]:
        """
        Parses explicit dimensions from a product title or keyword string.
        """
        if not text:
            return None

        # Check roll in meters first (e.g. 30 cm * 20 m foil/wrap/tape)
        m_roll = cls.ROLL_METER_REGEX.search(text)
        if m_roll:
            roll_w = cls._to_cm(float(m_roll.group(1)), m_roll.group(2))
            if "테이프" in text and roll_w <= 8.0:
                return (9.5, 9.5, round(max(1.5, roll_w), 1))
            if "리필" in text or "롤클리너" in text or "테이프클리너" in text:
                return (round(max(6.0, roll_w), 1), 6.5, 6.5)
            return (round(roll_w + 1.5, 1), 5.5, 5.5)

        # 1. Try 3D multiplication
        for m in cls.DIM_3D_REGEX.finditer(text):
            u3 = m.group(6)
            u2 = m.group(4) or u3
            u1 = m.group(2) or u2 or 'cm'
            w = cls._to_cm(float(m.group(1)), u1)
            d = cls._to_cm(float(m.group(3)), u2 or u1)
            h = cls._to_cm(float(m.group(5)), u3 or u1)
            if 0.4 <= w <= 180.0 and 0.4 <= d <= 180.0 and 0.3 <= h <= 150.0:
                return (round(w, 1), round(d, 1), round(h, 1))

        # 2. Try circular / turntable
        if any(k in text for k in ["원형", "회전", "턴테이블", "지름", "직경", "접시", "찬기", "그릇"]):
            mc = cls.CIRCULAR_REGEX.search(text)
            if mc:
                val_str = mc.group(1) or mc.group(3)
                unit_str = mc.group(2) or mc.group(4)
                if val_str:
                    dia = cls._to_cm(float(val_str), unit_str)
                    if 2.0 <= dia <= 80.0:
                        h = 4.0
                        if "2단" in text:
                            h = 16.0
                        elif "미용" in text or "4구" in text:
                            h = 10.0
                        return (round(dia, 1), round(dia, 1), round(h, 1))

        # 3. Try 2D multiplication (requires explicit cm/mm unit at end)
        m2d = cls.DIM_2D_EXPLICIT_REGEX.search(text)
        if m2d:
            u2 = m2d.group(4)
            u1 = m2d.group(2) or u2
            w = cls._to_cm(float(m2d.group(1)), u1)
            d = cls._to_cm(float(m2d.group(3)), u2)
            if 0.4 <= w <= 160.0 and 0.4 <= d <= 160.0:
                h = cls._infer_2d_thickness(text, w, d)
                return (round(w, 1), round(d, 1), round(h, 1))

        # 4. 1D explicit length/diameter in product title (e.g., "디저트 포크 13cm", "클리어 플리츠 접시 20 cm")
        m1d = re.search(r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)' + cls.NON_DIM_UNIT_AHEAD, text, re.IGNORECASE)
        if m1d:
            val = cls._to_cm(float(m1d.group(1)), m1d.group(2))
            if 3.0 <= val <= 80.0:
                if any(k in text for k in ["접시", "찬기", "원형", "냄비받침", "그릇", "볼", "공기", "대접", "면기", "프라이팬"]):
                    return (round(val, 1), round(val, 1), 3.5)
                if any(k in text for k in ["포크", "스푼", "나이프", "수저", "젓가락", "집게", "국자", "뒤집개", "주걱", "브러시", "가위", "커터", "자", "직선자", "플라이어", "드라이버", "펜치", "니퍼", "렌치"]):
                    return (3.0, round(val, 1), 1.8)
                if "고무장갑" in text and 22.0 <= val <= 50.0:
                    return (13.0, round(val, 1), 2.0)

        return None

    @classmethod
    def _infer_2d_thickness(cls, text: str, w: float, d: float) -> float:
        if any(k in text for k in ["매트", "시트", "깔개", "패드", "라이너", "포스터", "스티커", "필름", "옷커버"]):
            return 0.5
        if any(k in text for k in ["장갑", "양말", "덧신", "우의", "우비", "파우치", "가방", "백", "손수건", "타월", "수건", "행주", "수세미"]):
            return 2.0
        if any(k in text for k in ["가위", "칼", "포크", "스푼", "나이프", "수저", "국자", "뒤집개", "노트", "스케치북", "화일", "파일", "브러시", "솔", "지우개"]):
            return 1.8
        if "선반" in text or "거치대" in text or "바구니" in text:
            return 14.0
        if "접시" in text or "식판" in text or "찬기" in text:
            return 3.5
        return min(4.5, round(min(w, d), 1))

    @classmethod
    def parse_detail_text(cls, raw_txt: str, name: str = "") -> Optional[Tuple[float, float, float]]:
        """
        Extracts manufacturer dimensions from official Daiso spec descriptions (vsipPdDtl / pdDtlDc).
        Supports 3D, 2D, labeled (가로/세로/높이/너비/폭/길이/총길이/지름/직경/둘레), 2-line & 3-line standalone callouts, and 1D specs.
        """
        if not raw_txt:
            return None

        # Unescape HTML entities and strip tags if HTML/JSON is passed
        txt = html.unescape(raw_txt)
        txt = re.sub(r'<[^>]+>', '\n', txt)
        combined_ctx = f"{name}\n{txt}"

        # Check roll in meters first
        m_roll = cls.ROLL_METER_REGEX.search(txt)
        if m_roll and any(k in combined_ctx for k in ["호일", "랩", "백", "테이프", "시트지", "롤클리너"]):
            roll_w = cls._to_cm(float(m_roll.group(1)), m_roll.group(2))
            if "테이프" in combined_ctx and roll_w <= 8.0:
                return (9.5, 9.5, round(max(1.5, roll_w), 1))
            if 5.0 <= roll_w <= 60.0:
                return (round(roll_w + 1.5, 1), 5.5, 5.5)

        # 1. 3D multiplication patterns (prefer matches with explicit cm/mm unit)
        matches_3d = list(cls.DIM_3D_REGEX.finditer(txt))
        if matches_3d:
            # First pass: look for matches that have an explicit unit (cm or mm)
            for m in reversed(matches_3d):
                u3 = m.group(6)
                u2 = m.group(4) or u3
                u1 = m.group(2) or u2
                if not (u1 or u2 or u3):
                    continue
                unit = u3 or u2 or u1 or 'cm'
                w = cls._to_cm(float(m.group(1)), u1 or unit)
                d = cls._to_cm(float(m.group(3)), u2 or unit)
                h = cls._to_cm(float(m.group(5)), u3 or unit)
                if 0.4 <= w <= 200.0 and 0.4 <= d <= 200.0 and 0.3 <= h <= 160.0:
                    return (round(w, 1), round(d, 1), round(h, 1))

            # Second pass: allow unitless 3D if near 사이즈/크기/규격/SIZE
            for m in reversed(matches_3d):
                start_idx = max(0, m.start() - 40)
                context = txt[start_idx : m.end() + 20]
                if any(k in context.upper() for k in ["SIZE", "사이즈", "크기", "규격", "CM", "MM"]):
                    default_u = "mm" if "mm" in context.lower() else "cm"
                    w = cls._to_cm(float(m.group(1)), None, default_u)
                    d = cls._to_cm(float(m.group(3)), None, default_u)
                    h = cls._to_cm(float(m.group(5)), None, default_u)
                    if 0.4 <= w <= 200.0 and 0.4 <= d <= 200.0 and 0.3 <= h <= 160.0:
                        return (round(w, 1), round(d, 1), round(h, 1))

        # 2. Block dimensions under SIZE / 사이즈 / 크기 / 규격
        m_block = re.search(
            r'(?:SIZE|사이즈|크기|규격)[\s\:\n\r]+(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?[\s\n\r]+(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?[\s\n\r]+(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?',
            txt,
            re.IGNORECASE
        )
        if m_block:
            w = cls._to_cm(float(m_block.group(1)), m_block.group(2))
            d = cls._to_cm(float(m_block.group(3)), m_block.group(4))
            h = cls._to_cm(float(m_block.group(5)), m_block.group(6))
            if 0.4 <= w <= 200.0 and 0.4 <= d <= 200.0 and 0.3 <= h <= 160.0:
                return (round(w, 1), round(d, 1), round(h, 1))

        # 3. Labeled dimensions (가로/폭/너비, 세로/깊이/길이/총길이, 높이/두께, 지름/직경, 둘레)
        def _find_labeled(label_pat: str):
            # Prefix label: e.g. 가로: 약 15cm, (둘레)20CM, 길이-약 42cm
            m1 = re.search(
                r'(?:[\(\[]?\s*(?:' + label_pat + r')\s*[\)\]]?)\s*[:\-]?\s*[\(\[]?약?[\)\]]?\s*(?:[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm)?\s*~\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)',
                txt,
                re.IGNORECASE
            )
            if m1:
                return cls._to_cm(float(m1.group(1)), m1.group(2))
            # Suffix label: e.g. 약 3cm(높이), 190mm(가로)
            m2 = re.search(
                r'약?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)\s*[\(\[]\s*(?:' + label_pat + r')\s*[\)\]]',
                txt,
                re.IGNORECASE
            )
            if m2:
                return cls._to_cm(float(m2.group(1)), m2.group(2))
            return None

        w_val = _find_labeled(r'가로|폭|너비|손바닥\s*너비|W')
        d_val = _find_labeled(r'세로|깊이|길이|총\s*길이|전체\s*길이|등\s*길이|팔\s*길이|반접은\s*길이|D')
        h_val = _find_labeled(r'높이|두께|H')
        dia_val = _find_labeled(r'지름|직경')
        circ_val = _find_labeled(r'손바닥\s*둘레|손가락\s*둘레|손목\s*둘레|둘레')

        # 3A. Full 3D labeled (w, d, h)
        if w_val and d_val and h_val:
            if 0.4 <= w_val <= 200.0 and 0.4 <= d_val <= 200.0 and 0.3 <= h_val <= 160.0:
                return (round(w_val, 1), round(d_val, 1), round(h_val, 1))

        # 3B. Labeled Length + Circumference (e.g., 고무장갑: 길이 34cm + 손바닥 둘레 22cm)
        if d_val and circ_val:
            flat_w = round(circ_val / 2.0, 1) if "장갑" in combined_ctx and circ_val >= 14.0 else round(circ_val, 1)
            h_thk = cls._infer_2d_thickness(combined_ctx, flat_w, d_val)
            if 1.0 <= flat_w <= 150.0 and 1.0 <= d_val <= 200.0:
                return (flat_w, round(d_val, 1), h_thk)

        # 3C. Labeled Diameter + Height/Length (e.g., 쉐이브 폼: 높이 17.7cm + 지름 4.7cm, 붓펜: 길이 14.4cm + 지름 1.5cm)
        if dia_val and (h_val or d_val):
            other = h_val or d_val
            if d_val and not h_val and any(k in combined_ctx for k in ["펜", "연필", "샤프", "브러시", "솔", "롤", "봉", "빨대"]):
                return (round(dia_val, 1), round(d_val, 1), round(dia_val, 1))
            if 0.4 <= dia_val <= 150.0 and 0.3 <= other <= 160.0:
                return (round(dia_val, 1), round(dia_val, 1), round(other, 1))

        # 3D. Labeled Width/가로 + Height/높이 (e.g., 요석 제거제: 높이 22.5cm + 너비 10.5cm, 정사각 용기: 가로 14.5cm + 높이 5cm)
        if w_val and h_val and not d_val:
            if any(k in combined_ctx for k in ["옷커버", "커튼", "블라인드", "파우치", "쇼핑백", "타포린"]):
                return (round(w_val, 1), round(h_val, 1), cls._infer_2d_thickness(combined_ctx, w_val, h_val))
            # Cylindrical bottle or square container/coaster
            if 0.5 <= w_val <= 150.0 and 0.3 <= h_val <= 160.0:
                return (round(w_val, 1), round(w_val, 1), round(h_val, 1))

        # 3E. Labeled Width + Depth/Length (2D labeled)
        if w_val and d_val and not h_val:
            h_thk = cls._infer_2d_thickness(combined_ctx, w_val, d_val)
            if 0.4 <= w_val <= 200.0 and 0.4 <= d_val <= 200.0:
                return (round(w_val, 1), round(d_val, 1), h_thk)

        # 3F. Labeled Length + Thickness (e.g. 고무줄 두께 5mm, 반접은 길이 6cm)
        if d_val and h_val and not w_val:
            if 0.3 <= h_val <= 100.0 and 0.5 <= d_val <= 200.0:
                return (round(max(1.5, h_val), 1), round(d_val, 1), round(h_val, 1))

        # 4. Explicit 2D multiplication pattern (e.g. 약 8cm X 약 12cm, 0.6X20 cm)
        matches_2d = list(cls.DIM_2D_EXPLICIT_REGEX.finditer(txt))
        if matches_2d:
            for m in reversed(matches_2d):
                u2 = m.group(4)
                u1 = m.group(2) or u2
                w = cls._to_cm(float(m.group(1)), u1)
                d = cls._to_cm(float(m.group(3)), u2)
                if 0.4 <= w <= 200.0 and 0.4 <= d <= 200.0:
                    if "캔들" in combined_ctx or "초" in combined_ctx:
                        return (round(w, 1), round(w, 1), round(d, 1))
                    h = cls._infer_2d_thickness(combined_ctx, w, d)
                    return (round(w, 1), round(d, 1), round(h, 1))

        # 4B. Comma-separated 2D on a single line (e.g. "약 18cm, 약 12cm" or "사이즈: 15.5cm, 17.5cm")
        for line in txt.split("\n"):
            if any(k in line for k in ["소형", "중형", "대형", "오차"]):
                continue
            m_comma2d = re.search(
                r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)\s*,\s*(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)',
                line,
                re.IGNORECASE
            )
            if m_comma2d:
                w = cls._to_cm(float(m_comma2d.group(1)), m_comma2d.group(2))
                d = cls._to_cm(float(m_comma2d.group(3)), m_comma2d.group(4))
                if 1.0 <= w <= 150.0 and 1.0 <= d <= 150.0:
                    h = cls._infer_2d_thickness(combined_ctx, w, d)
                    return (round(w, 1), round(d, 1), round(h, 1))

        # 5. Line-by-line consecutive standalone dimensions (supports 3-line AND 2-line callouts)
        lines = [l.strip() for l in txt.split("\n") if l.strip()]
        standalone_groups = []
        current_group = []
        for line in lines:
            # Strip leading bullets (-, *, •) and trailing tolerance (±3mm, (±1cm), etc.)
            cleaned_line = re.sub(r'^[\-\*\•\·\s]+', '', line)
            cleaned_line = re.sub(r'[\(\[]?\s*(?:오차\s*범위\s*[:\s]*)?[±\+\-]\s*[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm)?\s*[\)\]]?.*$', '', cleaned_line, flags=re.IGNORECASE).strip()
            m_line = re.match(r'^약?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)$', cleaned_line, re.IGNORECASE)
            if m_line:
                val = cls._to_cm(float(m_line.group(1)), m_line.group(2))
                if 0.4 <= val <= 200.0:
                    current_group.append(val)
            else:
                if len(current_group) >= 2:
                    standalone_groups.append(list(current_group))
                if current_group and not any(k in line.upper() for k in ['약', 'CM', 'MM', '사이즈', 'SIZE', '크기', '규격', '오차']):
                    current_group.clear()
        if len(current_group) >= 2:
            standalone_groups.append(list(current_group))

        # Prefer a 3-element group first, otherwise use a 2-element group
        for grp in standalone_groups:
            if len(grp) >= 3:
                w, d, h = grp[0], grp[1], grp[2]
                if 0.4 <= w <= 200.0 and 0.4 <= d <= 200.0 and 0.3 <= h <= 160.0:
                    return (round(w, 1), round(d, 1), round(h, 1))
        for grp in standalone_groups:
            if len(grp) == 2:
                v1, v2 = grp[0], grp[1]
                # Deduplicate identical 2-line callouts if both are small (e.g. 2.5cm, 2.5cm cube)
                w, d = min(v1, v2), max(v1, v2)
                if "장갑" in combined_ctx and w >= 16.0 and d >= 22.0:
                    # Standalone palm circumference + length (e.g. 20.5cm, 32.5cm) -> flat width is circumference / 2
                    w = round(w / 2.0, 1)
                h = cls._infer_2d_thickness(combined_ctx, w, d)
                return (round(w, 1), round(d, 1), round(h, 1))

        # 6. Circular / round (지름 / 직경)
        circ_m = cls.CIRCULAR_REGEX.search(txt)
        if circ_m:
            val_str = circ_m.group(1) or circ_m.group(3)
            unit_str = circ_m.group(2) or circ_m.group(4)
            if val_str:
                dia = cls._to_cm(float(val_str), unit_str)
                h = h_val if h_val else 4.0
                if 2.0 <= dia <= 120.0 and 0.3 <= h <= 100.0:
                    return (round(dia, 1), round(dia, 1), round(h, 1))

        # 7. Single standalone or labeled 1D spec (e.g., pen 14cm, dessert fork 13cm, makeup brush 17.5cm, plate 20cm)
        single_val = d_val or w_val
        if not single_val:
            for line in lines:
                cleaned_line = re.sub(r'^[\-\*\•\·\s]+', '', line)
                cleaned_line = re.sub(r'[\(\[]?\s*(?:오차\s*범위\s*[:\s]*)?[±\+\-]\s*[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm)?\s*[\)\]]?.*$', '', cleaned_line, flags=re.IGNORECASE).strip()
                m1 = re.match(r'^약?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)$', cleaned_line, re.IGNORECASE)
                if m1:
                    v = cls._to_cm(float(m1.group(1)), m1.group(2))
                    if 3.0 <= v <= 100.0:
                        single_val = v
                        break
        if single_val and 3.0 <= single_val <= 100.0:
            if any(k in combined_ctx for k in ["접시", "찬기", "그릇", "볼", "공기", "대접", "면기", "원형", "냄비받침"]):
                return (round(single_val, 1), round(single_val, 1), 3.5)
            if any(k in combined_ctx for k in ["펜", "샤프", "연필", "브러시", "솔", "포크", "스푼", "나이프", "수저", "젓가락", "가위", "커터", "칫솔", "면도기", "빨대", "핀셋", "드라이버", "플라이어", "펜치", "니퍼", "렌치"]):
                return (2.5, round(single_val, 1), 1.8)
            return (round(max(2.5, min(12.0, single_val * 0.25)), 1), round(single_val, 1), 2.5)

        return None

    @classmethod
    def parse_dimensions_cm(cls, text: str) -> Optional[Tuple[float, float, float]]:
        return cls.parse_explicit_dims(text) or cls.parse_detail_text(text)

    @classmethod
    def normalize_packaged_dims(
        cls, name: str, cat_key: str, w: float, d: float, h: float
    ) -> Tuple[float, float, float]:
        """
        Converts unfolded sheet/towel/roll dimensions into realistic folded/packaged storage dimensions
        so items fit properly inside drawers and shelves.
        """
        # 1. Foil / Cling Wrap / Roll Bags in meters (e.g. 종이호일 30cm*20m)
        m_roll = cls.ROLL_METER_REGEX.search(name)
        if m_roll:
            roll_w = cls._to_cm(float(m_roll.group(1)), m_roll.group(2))
            if "테이프" in name and roll_w <= 8.0:
                return (9.5, 9.5, round(max(1.5, roll_w), 1))
            if "리필" in name or "롤클리너" in name or "테이프클리너" in name:
                return (round(max(6.0, roll_w), 1), 6.5, 6.5)
            return (round(roll_w + 1.5, 1), 5.5, 5.5)

        # 2. Towels / Shower Towels / Cloths (when unfolded length >= 45cm)
        if any(k in name for k in ["샤워타월", "샤워 타월", "세안타월", "목욕타월", "때타월"]):
            if max(w, d) >= 40.0:
                return (12.0, 16.0, 3.5)
        if any(k in name for k in ["수건", "타올", "발매트"]):
            if max(w, d) >= 45.0:
                return (15.0, 22.0, 5.5)
        if any(k in name for k in ["행주", "걸레", "타월"]):
            if max(w, d) >= 40.0:
                return (12.0, 15.0, 3.0)

        # 3. Tablecloths / Curtains / Blankets / Picnic Mats / Tarps
        if any(k in name for k in ["테이블보", "테이블 보", "식탁보", "커튼", "블라인드", "방수포", "돗자리", "레저시트"]):
            if max(w, d) >= 50.0:
                return (18.0, 24.0, 4.5)
        if any(k in name for k in ["담요", "무릎담요", "차렵이불", "방석"]):
            if max(w, d) >= 55.0:
                return (22.0, 26.0, 7.0)

        # 4. Flat Plastic Bags / Zipper Bags / Trash Bags (when flat sheet dimensions are large)
        if any(k in name for k in ["지퍼백", "크린백", "위생팩", "비닐봉투", "쓰레기봉투", "쇼핑백", "배변봉투"]):
            if max(w, d) >= 35.0:
                return (20.0, 8.0, 5.5)

        # 5. Upright Bottles, Sprays, Jars, Dispensers, Tubes where depth and height are swapped in Korean specs (세로 = 높이)
        is_upright = any(k in name for k in [
            "오일병", "스프레이", "양념통", "보틀", "텀블러", "물병", "소스병", "디스펜서",
            "치약", "샴푸", "린스", "바디워시", "세정제", "세제", "트래펑", "락스", "섬유유연제",
            "피죤", "탈취제", "방향제", "핸드워시", "클렌징폼", "폼클렌징", "로션", "토너",
            "에센스", "세럼", "미스트", "헤어오일", "클렌징오일", "클렌징 오일"
        ])
        if is_upright and d > h * 1.4 and d >= 8.0:
            if "치약" in name:
                w, d, h = 4.5, 3.5, d
            elif any(k in name for k in ["오일병", "보틀", "텀블러", "물병", "소스병"]):
                dia = round(max(w, h), 1)
                w, d, h = dia, dia, d
            else:
                w, d, h = w, h, d

        # 6. Cosmetic Creams, Balms, Cushions, Pacts in small jars (밤, 크림, 팩트, 쿠션)
        is_balm_jar = any(k in name for k in ["오일밤", "클렌징밤", "멜팅밤", "수분크림", "영양크림", "크림 50", "크림 60", "크림 70", "크림 80", "크림 100", "밤 50", "밤 60", "밤 70", "밤 80"])
        if is_balm_jar and h > 8.0:
            dia = round(min(max(w, d), 7.0), 1)
            w, d, h = dia, dia, 4.0

        return (round(w, 1), round(d, 1), round(h, 1))

    @classmethod
    def infer_stored_item_dims(cls, name: str, cat_key: str) -> Tuple[float, float, float]:
        """
        Infers realistic dimensions for products whose online spec is image-only.
        Includes Daiso's numbered organizer series (1호~12호) so storage items never default to 10x10x10.
        """
        name_lower = name.lower()

        # --- A. Storage & Organizers (수납/정리함 세부 추론) ---
        if cat_key == "storage" or any(k in name for k in ["정리함", "케이스", "바구니", "트레이", "수납함", "리빙박스", "폴딩", "선반"]):
            # 1. Numbered Daiso Case / Organizer Series (1호 ~ 12호)
            m_no = re.search(r'([0-9]+)\s*호', name)
            if m_no:
                no = int(m_no.group(1))
                series_map = {
                    1: (22.0, 15.0, 17.0),
                    2: (15.0, 11.0, 8.5),
                    3: (22.0, 15.0, 8.5),
                    4: (30.0, 22.0, 8.5),
                    5: (30.0, 22.0, 17.0),
                    6: (26.0, 18.0, 8.5),
                    7: (26.0, 18.0, 16.0),
                    8: (26.0, 18.0, 12.0),
                    9: (15.0, 7.5, 8.5),
                    10: (22.0, 7.5, 8.5),
                    11: (15.0, 15.0, 8.5),
                    12: (15.0, 15.0, 12.5),
                }
                if no in series_map:
                    return series_map[no]

            # 2. Compartmentalized Section Cases (칸막이 / 섹션 케이스 / N구 / N칸)
            if any(k in name for k in ["섹션", "칸막이", "분할", "다용도 보관케이스", "알약", "부품"]):
                m_slots = re.search(r'([0-9]+)\s*(?:칸|구)', name)
                slots = int(m_slots.group(1)) if m_slots else 10
                if slots >= 20:
                    return (27.5, 17.5, 4.5)
                elif slots >= 12:
                    return (24.0, 16.0, 4.5)
                elif slots >= 6:
                    return (18.0, 11.0, 3.5)
                return (15.0, 9.0, 3.5)

            # 3. Ice Trays (아이스 트레이 / 얼음틀)
            if any(k in name for k in ["아이스 트레이", "아이스트레이", "얼음틀", "얼음 트레이"]):
                return (26.0, 12.5, 4.5)

            # 4. Folding Boxes (폴딩박스 / 접이식 상자)
            if any(k in name for k in ["폴딩", "접이식"]):
                if any(k in name for k in ["대형", "특대", "캠핑"]):
                    return (44.0, 31.0, 23.0)
                if "중형" in name:
                    return (34.0, 25.0, 13.5)
                return (24.5, 16.5, 9.5)

            # 5. Turntables & Cosmetic Organizers (회전형 / 미용 정리함 / 브러시꽂이)
            if any(k in name for k in ["회전", "턴테이블"]):
                if "미용" in name or "화장품" in name or "4구" in name or "5구" in name:
                    return (22.0, 22.0, 11.0)
                return (28.0, 28.0, 4.5)
            if any(k in name for k in ["미용", "화장품", "립스틱", "브러시", "화장대"]):
                return (18.5, 10.5, 9.5)

            # 6. Desk / File / Book Organizers (책꽂이 / 화일박스 / 서류함 / 펜꽂이)
            if any(k in name for k in ["책꽂이", "북엔드", "화일", "파일", "서류", "A4", "a4"]):
                return (10.5, 25.5, 30.0)
            if any(k in name for k in ["펜꽂이", "연필꽂이", "데스크", "명함"]):
                return (9.0, 9.0, 11.0)

            # 7. Kitchen Racks / Dish Stands / Cutlery Trays (접시 스탠드 / 수저통 / 프라이팬 정리대 / 김치통)
            if any(k in name for k in ["접시", "도마", "프라이팬", "냄비"]):
                return (26.0, 18.0, 14.0)
            if any(k in name for k in ["수저", "커트러리", "포크", "나이프"]):
                return (26.0, 11.0, 5.5)
            if any(k in name for k in ["김치통", "밀폐용기", "보관용기", "반찬통", "채반"]):
                m_vol = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(ml|l|리터)', name_lower)
                if m_vol:
                    vol = float(m_vol.group(1))
                    if m_vol.group(2) in ['l', '리터']:
                        vol *= 1000.0
                    if vol >= 4000: return (28.0, 20.0, 14.5)
                    if vol >= 2000: return (23.0, 16.5, 11.0)
                    if vol >= 1000: return (19.0, 13.5, 8.5)
                    return (14.5, 10.5, 6.5)
                return (19.0, 13.5, 8.5)

            # 8. Fabric / Closet / Underwear / Shoe Organizers (패브릭 / 부직포 / 속옷 / 신발)
            if any(k in name for k in ["패브릭", "부직포", "속옷", "언더웨어", "양말 정리"]):
                if "슬림" in name or "소형" in name:
                    return (28.0, 14.0, 11.5)
                return (28.0, 28.0, 14.0)
            if any(k in name for k in ["신발", "슈즈"]):
                return (25.0, 33.0, 17.5)

            # 9. Baskets & Trays by size keyword (소형 / 중형 / 대형 / 슬림 / 와이드)
            if any(k in name for k in ["슬림", "좁은", "펜트레이"]):
                return (24.0, 8.5, 5.0)
            if any(k in name for k in ["와이드", "넓은", "대형", "특대"]):
                return (34.0, 24.0, 14.0)
            if any(k in name for k in ["중형", "2단"]):
                return (26.0, 18.0, 12.0)
            if any(k in name for k in ["소형", "미니"]):
                return (16.0, 11.5, 7.5)
            if "트레이" in name:
                return (24.0, 16.0, 4.5)
            if "바구니" in name:
                return (25.0, 17.0, 12.0)
            if "선반" in name:
                return (30.0, 15.0, 15.0)
            if "리빙박스" in name or "수납박스" in name:
                return (36.0, 26.0, 22.0)

        # --- B. Everyday Goods & Consumables (Granular Item-Specific Estimation for Image-Only Specs) ---
        m_vol = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(ml|l|리터|g|kg|매|개입|켤레|p)', name_lower)
        vol = float(m_vol.group(1)) if m_vol else None
        unit = m_vol.group(2) if m_vol else None
        if unit in ['l', '리터', 'kg'] and vol:
            vol = vol * 1000.0

        # 1. Rubber Gloves & Disposable Gloves (고무장갑 / 위생장갑 / 라텍스장갑 / 목장갑)
        if '고무장갑' in name:
            pairs = int(vol) if (unit in ['켤레', '개입', 'p'] and vol) else 1
            h_thk = min(8.0, round(1.8 + (pairs - 1) * 0.8, 1))
            if any(k in name for k in ['단미니', '미니', '짧은', '숏']):
                return (10.5, 25.0, h_thk)
            if '속장갑' in name:
                return (10.0, 20.0, h_thk)
            if any(k in name for k in ['특대', 'XL', 'xl']):
                return (12.5, 40.0, h_thk)
            if any(k in name for k in ['대형', '(대)', ' L']):
                return (12.0, 35.0, h_thk)
            if any(k in name for k in ['소형', '(소)', ' S']):
                return (10.5, 31.0, h_thk)
            return (11.5, 33.0, h_thk)

        if any(k in name for k in ['위생장갑', '위생 장갑', '라텍스장갑', '니트릴장갑', '비닐장갑']):
            return (13.0, 24.0, 4.5)
        if '장갑' in name:
            return (11.0, 23.0, 2.5)

        # 2. Cleaning Brushes, Scrubbers, Sponges, Drain Nets (수세미 / 청소솔 / 스펀지 / 배수구망)
        if any(k in name for k in ['수세미', '아크릴수세미', '망사수세미', '철수세미']):
            if vol and unit in ['개입', '매', 'p'] and vol >= 4:
                return (11.0, 16.0, 6.5)
            return (8.5, 12.5, 3.0)
        if any(k in name for k in ['매직블럭', '매직스펀지', '청소 스펀지', '세척 스펀지']):
            return (10.0, 15.0, 4.5)
        if '변기솔' in name or '변기 솔' in name:
            return (10.0, 10.0, 38.0)
        if any(k in name for k in ['청소솔', '청소 솔', '세척솔', '틈새솔', '바닥솔', '타일솔']):
            if '미니' in name or '틈새' in name:
                return (3.5, 18.0, 2.5)
            return (7.0, 23.0, 5.0)
        if any(k in name for k in ['배수구망', '거름망', '싱크대망']):
            return (12.0, 15.0, 4.0)

        # 3. Food Containers & Airtight Boxes in kitchen_food (밀폐용기 / 반찬통 / 도시락)
        if any(k in name for k in ['밀폐용기', '보관용기', '반찬통', '김치통', '냉동용기', '도시락', '찬통', '밸브 용기']):
            if unit == 'ml' and vol:
                if vol >= 4000: return (28.0, 20.0, 14.5)
                if vol >= 2000: return (23.0, 16.5, 11.0)
                if vol >= 1000: return (19.0, 13.5, 8.5)
                if vol >= 450: return (15.5, 11.5, 6.5)
                if vol >= 200: return (12.0, 9.0, 5.5)
                return (9.0, 6.5, 4.0)
            return (16.0, 12.0, 7.0)

        # 4. Sprays, Deodorizers, Fabric Softeners, Liquid Cleaners
        if any(k in name for k in ['스프레이', '분무기', '폼타입', '버블', '칙칙이', '탈취제', '에어컨']):
            if unit == 'ml' and vol and vol <= 150: return (5.0, 5.0, 14.5)
            if unit == 'ml' and vol and vol <= 300: return (6.5, 6.5, 18.5)
            if unit == 'ml' and vol and vol >= 700: return (10.5, 8.5, 26.5)
            return (8.5, 7.5, 22.5)

        if any(k in name for k in ['세정제', '락스', '클리너', '제거제', '트래펑', '세제', '표백', '소독', '샤프란', '섬유유연제', '에탄올']):
            if unit == 'ml' and vol:
                if vol >= 1800: return (13.0, 13.0, 31.0)
                if vol >= 900: return (9.5, 9.5, 26.0)
                if vol >= 400: return (8.0, 8.0, 21.5)
                if vol <= 120: return (4.5, 4.5, 12.5)
            return (7.0, 7.0, 17.5)

        # 4b. Cosmetic Balms, Creams, Jars, Compacts (밤 / 크림 / 팩트 / 쿠션 / 바셀린)
        if any(k in name for k in ['오일밤', '클렌징밤', '멜팅밤', '수분크림', '영양크림', '크림', '바셀린', '팩트', '쿠션', '립밤', '밤 60', '밤 50']):
            return (6.5, 6.5, 4.0)

        # 4c. Edible Cooking Oils & Seasoning Oil Bottles (오일병 / 참기름 / 들기름 / 식용유 / 올리브유)
        if any(k in name for k in ['오일병', '참기름', '들기름', '식용유', '올리브유', '카놀라유', '포도씨유']):
            if vol and vol >= 500: return (6.5, 6.5, 23.0)
            if vol and vol >= 250: return (5.5, 5.5, 18.0)
            return (5.0, 5.0, 14.0)

        if any(k in name for k in ['샴푸', '린스', '트리트먼트', '바디워시', '핸드워시', '폼클렌징', '클렌징폼', '클렌저', '클렌징']):
            if unit == 'ml' and vol and vol <= 200: return (6.0, 4.5, 15.5)
            if unit == 'ml' and vol and vol <= 350: return (7.5, 6.5, 16.5)
            if unit == 'ml' and vol and vol >= 800: return (10.0, 10.0, 24.5)
            return (8.5, 8.5, 20.5)

        # 5. Bath & Oral Care (칫솔 / 치약 / 비누 / 면도기 / 후크)
        if '칫솔' in name or '치실' in name or '치간칫솔' in name:
            if '꽂이' in name or '걸이' in name:
                return (5.0, 5.0, 4.5)
            return (4.0, 19.0, 2.0)
        if '치약' in name:
            return (5.0, 4.0, 16.5)
        if '비누' in name:
            return (6.5, 9.5, 3.5)
        if '면도기' in name or '면도날' in name:
            return (5.0, 15.0, 2.5)
        if any(k in name for k in ['후크', '접착식 걸이', '다용도 걸이', '흡착 걸이']):
            return (5.0, 6.0, 3.0)

        # 6. Kitchen Utensils, Cutlery, Tableware, Zipper Bags, Paper Towels
        if any(k in name for k in ['위생백', '지퍼백', '크린백', '비닐백', '비닐봉투']):
            return (19.0, 7.5, 5.0)
        if any(k in name for k in ['키친타월', '키친타올', '두루마리', '롤화장지']):
            return (22.0, 12.0, 23.0)
        if any(k in name for k in ['수저', '숟가락', '젓가락', '포크', '나이프', '스푼', '티스푼']):
            return (3.5, 19.5, 1.8)
        if any(k in name for k in ['국자', '뒤집개', '주걱', '집게', '거품기', '감자칼', '강판', '채칼', '가위']):
            if '가위' in name:
                return (7.5, 18.5, 1.5)
            return (7.5, 27.0, 4.0)
        if any(k in name for k in ['접시', '찬기', '그릇', '대접', '면기', '공기', '볼', '식판']):
            return (16.5, 16.5, 4.5)
        if '조미료통' in name or '양념통' in name or '오일병' in name or '소스병' in name:
            return (6.0, 6.0, 12.5)
        if any(k in name for k in ['베이킹소다', '과탄산소다', '구연산']):
            return (14.0, 8.0, 21.0)

        # 7. Stationery (Strict word matching to avoid '샤프란', '칼라', '병풀')
        if any(k in name for k in ['볼펜', '형광펜', '필기구', '연필', '만년필', '사인펜', '네임펜', '붓펜', '마카']) or re.search(r'(?:^|\s)샤프(?:\s|$|심)', name):
            return (1.5, 14.5, 1.5)
        if '커터칼' in name or '문구용 칼' in name or '박스테이프 칼' in name:
            return (2.5, 14.0, 1.5)
        if '테이프' in name:
            return (5.5, 5.5, 2.0)
        if any(k in name for k in ['포스트잇', '메모지', '점착메모', '지우개']):
            return (7.5, 7.5, 1.5)
        if any(k in name for k in ['딱풀', '물풀', '목공풀', '풀테이프']):
            return (2.5, 9.5, 2.5)
        if '스테이플러' in name or '호치케스' in name or '펀치' in name:
            return (3.5, 12.0, 5.0)
        if any(k in name for k in ['노트', '수첩', '다이어리', '스케치북', '공책']):
            return (15.0, 21.0, 1.5)
        if any(k in name for k in ['화일', '바인더', '클리어파일', '섹션 파일', '쇼핑백']):
            return (24.0, 31.0, 2.5)

        # 8. Beauty & Cosmetics (Strict matching so '콤팩트' organizer doesn't match '팩트')
        if ('쿠션' in name or '파운데이션' in name or '팩트' in name) and '콤팩트' not in name and '방석' not in name:
            return (7.5, 7.5, 2.5)
        if any(k in name for k in ['립스틱', '틴트', '립밤', '립글로스', '마스카라', '아이라이너', '아이브로우', '컨실러']):
            return (2.2, 2.2, 8.5)
        if '아이섀도우' in name or '섀도우' in name or '블러셔' in name:
            return (5.5, 5.5, 1.5)
        if '마스크팩' in name or '시트팩' in name or '코팩' in name:
            return (11.0, 16.0, 0.5)
        if any(k in name for k in ['스킨', '토너', '로션', '에센스', '세럼', '앰플', '미스트', '리무버']):
            return (4.5, 4.5, 14.0)
        if any(k in name for k in ['크림', '수분크림', '영양크림', '아이패치']):
            return (6.5, 6.5, 5.5)
        if any(k in name for k in ['선크림', '선블록', '선스틱', '핸드크림']):
            return (4.5, 3.0, 12.5)
        if '향수' in name:
            return (4.5, 4.5, 10.0)
        if '네일' in name or '매니큐어' in name:
            return (3.0, 3.0, 7.0)
        if '화장솜' in name:
            return (11.0, 15.0, 7.0)
        if '면봉' in name:
            return (8.0, 8.0, 8.5)
        if '브러시' in name or '퍼프' in name or '뷰러' in name:
            return (4.0, 16.0, 2.5)

        # 9. Digital & Tools
        if any(k in name for k in ['충전기', '어댑터', '젠더', '리더기', '허브']): return (4.5, 8.0, 2.5)
        if '케이블' in name or '이어폰' in name: return (5.0, 10.0, 2.0)
        if '보조배터리' in name: return (7.0, 14.0, 1.6)
        if '건전지' in name: return (5.5, 11.5, 1.8)
        if '멀티탭' in name: return (6.0, 25.0, 4.5)
        if '드라이버' in name or '펜치' in name or '니퍼' in name or '렌치' in name: return (3.5, 18.0, 3.0)
        if '줄자' in name: return (6.5, 6.5, 3.0)

        # 10. Living, Fashion, Food, Pets
        if '물티슈' in name or '티슈' in name:
            if vol and vol <= 40: return (9.0, 14.0, 3.5)
            return (12.0, 20.0, 6.5)
        if any(k in name for k in ['테이프크리너', '돌돌이']): return (8.0, 24.0, 7.5)
        if '양말' in name or '덧신' in name: return (8.0, 12.0, 3.0)
        if '스타킹' in name: return (10.0, 14.0, 2.0)
        if '슬리퍼' in name or '거실화' in name: return (21.0, 27.0, 7.5)
        if '파우치' in name or '지갑' in name: return (14.0, 18.0, 4.5)
        if '안경케이스' in name: return (6.5, 16.0, 4.0)
        if '손톱깎이' in name: return (2.0, 8.0, 1.8)
        if '우산' in name: return (6.0, 25.0, 6.0)
        if '옷걸이' in name: return (41.0, 21.0, 2.5)

        if any(k in name for k in ['소스', '양념', '참소스']): return (6.5, 6.5, 17.0)
        if any(k in name for k in ['음료', '커피', '드립', '티백']) or ('캔' in name and '캔들' not in name): return (6.5, 6.5, 13.0)
        if any(k in name for k in ['과자', '스낵', '젤리', '사탕', '초콜릿']): return (14.0, 19.0, 4.5)
        if '라면' in name: return (13.0, 14.0, 4.0)
        if '텀블러' in name or '보온병' in name or '물병' in name: return (7.5, 7.5, 20.0)
        if ('머그컵' in name or '유리컵' in name or '종이컵' in name or '컵' in name) and '홀더' not in name: return (8.5, 10.5, 9.5)
        if any(k in name for k in ['간식', '사료', '츄르']): return (12.0, 18.0, 4.0)

        if cat_key == 'stationery': return (4.0, 15.0, 2.0)
        if cat_key == 'beauty': return (4.5, 4.5, 9.5)
        if cat_key == 'digital_tools': return (5.0, 12.0, 3.0)
        if cat_key == 'living_fashion': return (10.0, 15.0, 4.0)
        if cat_key == 'kitchen_food': return (10.0, 14.0, 7.0)
        if cat_key == 'pet_hobby': return (8.0, 12.0, 6.0)
        if cat_key == 'bath_cleaning': return (8.0, 12.0, 10.0)
        if cat_key == 'bath_body': return (7.5, 7.5, 16.0)

        return (18.0, 13.0, 7.5)

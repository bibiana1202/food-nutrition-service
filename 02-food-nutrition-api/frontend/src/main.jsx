import { StrictMode, useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { registerFoodDetailsTool } from './webmcp';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Filter,
  FlaskConical,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
  Pencil,
  ArrowUpRight,
} from 'lucide-react';
import { nutrientFields, foodCreateSchema } from './schema';
import { api, RequestError } from './api';
import './styles.css';
const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 3 });
const show = (value) =>
  value === null || value === void 0 || value === ''
    ? '\u2014'
    : typeof value === 'number'
      ? number.format(value)
      : String(value);
const nutrientLabels = {
  serving_size: ['1\uD68C \uC81C\uACF5\uB7C9', ''],
  calorie: ['\uC5F4\uB7C9', 'kcal'],
  carbohydrate: ['\uD0C4\uC218\uD654\uBB3C', 'g'],
  protein: ['\uB2E8\uBC31\uC9C8', 'g'],
  fat: ['\uC9C0\uBC29', 'g'],
  sugars: ['\uCD1D\uB2F9\uB958', 'g'],
  sodium: ['\uB098\uD2B8\uB968', 'mg'],
  cholesterol: ['\uCF5C\uB808\uC2A4\uD14C\uB864', 'mg'],
  saturated_fatty_acids: ['\uD3EC\uD654\uC9C0\uBC29\uC0B0', 'g'],
  trans_fat: ['\uD2B8\uB79C\uC2A4\uC9C0\uBC29', 'g'],
};
const emptyFilters = { food_name: '', food_code: '', research_year: '', maker_name: '' };
function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog wide' : 'dialog'}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" aria-label="닫기" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div className="error" role="alert">
      {error instanceof Error
        ? error.message
        : '\uC694\uCCAD\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.'}
      {error instanceof RequestError && error.payload.error.details.length > 0 && (
        <ul>
          {error.payload.error.details.map((detail, i) => (
            <li key={i}>
              {detail.field}: {detail.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function FoodForm({ food, adminKey, onClose, onSaved }) {
  const [error, setError] = useState();
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {};
    for (const [key, value] of form.entries()) {
      const text = String(value).trim();
      input[key] =
        nutrientFields.includes(key) || key === 'research_year'
          ? text
            ? Number(text)
            : null
          : text || null;
    }
    const parsed = foodCreateSchema.safeParse(input);
    if (!parsed.success) {
      setError(
        new Error(
          parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('\n'),
        ),
      );
      return;
    }
    let body = parsed.data;
    if (food)
      body = Object.fromEntries(Object.entries(body).filter(([key, value]) => food[key] !== value));
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError(void 0);
    try {
      await api(`/api/foods${food ? `/${food.id}` : ''}`, {
        method: food ? 'PATCH' : 'POST',
        body,
        key: adminKey,
      });
      onSaved();
    } catch (error2) {
      setError(error2);
      setBusy(false);
    }
  }
  const textField = (key, label, required = false, maxLength = 300) => (
    <label key={key}>
      {label}
      {required && <span className="required"> *</span>}
      <input
        name={key}
        defaultValue={String(food?.[key] ?? '')}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
      />
    </label>
  );
  return (
    <Dialog
      title={food ? '\uC2DD\uD488 \uC815\uBCF4 \uC218\uC815' : '\uC2DD\uD488 \uB4F1\uB85D'}
      onClose={() => !busy && onClose()}
      wide
    >
      <form onSubmit={submit}>
        <div className="dialog-body">
          <ErrorMessage error={error} />
          <h3>기본 정보</h3>
          <div className="form-grid">
            {textField('food_name', '\uC2DD\uD488\uBA85', true)}
            {textField('food_cd', '\uC2DD\uD488\uCF54\uB4DC', true, 64)}
            {textField('group_name', '\uC2DD\uD488\uAD70')}
            {textField('maker_name', '\uC9C0\uC5ED / \uC81C\uC870\uC0AC')}
            <label>
              조사년도
              <input
                type="number"
                name="research_year"
                min="1900"
                max="2100"
                step="1"
                defaultValue={food?.research_year ?? ''}
              />
            </label>
            {textField('ref_name', '\uC790\uB8CC\uCD9C\uCC98', false, 1e3)}
            {textField('source_notes', '\uC6D0\uBCF8 \uC218\uCE58 \uCC38\uACE0', false, 1e3)}
          </div>
          <h3>제공량과 영양성분</h3>
          <p className="field-help">알 수 없는 값은 비워두세요. 0과 구분하여 저장합니다.</p>
          <div className="form-grid nutrients-form">
            {nutrientFields.map((field) => (
              <label key={field}>
                {nutrientLabels[field][0]}{' '}
                {nutrientLabels[field][1] && (
                  <span className="muted">({nutrientLabels[field][1]})</span>
                )}
                <input
                  name={field}
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="any"
                  defaultValue={food?.[field] ?? ''}
                />
              </label>
            ))}
            <label>
              제공량 단위
              <select name="serving_unit" defaultValue={food?.serving_unit ?? ''}>
                <option value="">미상</option>
                <option value="g">g</option>
                <option value="mL">mL</option>
              </select>
            </label>
          </div>
        </div>
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? '\uC800\uC7A5 \uC911\u2026' : '\uC800\uC7A5'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [refresh, setRefresh] = useState(0);
  const [adminKey, setAdminKey] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState();
  const [authBusy, setAuthBusy] = useState(false);
  const [selected, setSelected] = useState();
  const [editor, setEditor] = useState();
  const [deleting, setDeleting] = useState();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState();
  const [notice, setNotice] = useState('');
  const detailSequence = useRef(0);
  useEffect(
    () =>
      registerFoodDetailsTool((food) => {
        flushSync(() => {
          setSelected(food);
          setEditor(void 0);
          setDeleting(void 0);
        });
      }),
    [],
  );
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    Object.entries(applied).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    setLoading(true);
    setError(void 0);
    api(`/api/foods?${params}`, { signal: abort.signal })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((error2) => {
        if (!abort.signal.aborted) {
          setError(error2);
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [applied, page, pageSize, refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5e3);
    return () => clearTimeout(timer);
  }, [notice]);
  async function openDetails(food) {
    const sequence = ++detailSequence.current;
    try {
      const fresh = await api(`/api/foods/${food.id}`);
      if (sequence === detailSequence.current) setSelected(fresh);
    } catch (error2) {
      setError(error2);
    }
  }
  const reset = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };
  const saved = () => {
    setEditor(void 0);
    setSelected(void 0);
    setRefresh((value) => value + 1);
    setNotice('\uC2DD\uD488 \uC815\uBCF4\uB97C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.');
  };
  async function authenticate(event) {
    event.preventDefault();
    const key = String(new FormData(event.currentTarget).get('key') ?? '').trim();
    setAuthBusy(true);
    setAuthError(void 0);
    try {
      await api('/api/admin/verify', { method: 'POST', key });
      setAdminKey(key);
      setAuthOpen(false);
      setNotice('\uAD00\uB9AC\uC790 \uC778\uC99D\uC744 \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.');
    } catch (error2) {
      setAuthError(error2);
    } finally {
      setAuthBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(void 0);
    try {
      await api(`/api/foods/${deleting.id}`, { method: 'DELETE', key: adminKey });
      setDeleting(void 0);
      setSelected(void 0);
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      else setRefresh((value) => value + 1);
      setNotice('\uC2DD\uD488 \uC815\uBCF4\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.');
    } catch (error2) {
      setDeleteError(error2);
    } finally {
      setDeleteBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="식품영양성분 관리 홈">
          <span className="brand-mark">
            <FlaskConical size={23} />
          </span>
          <span>
            영양정보<span className="brand-caption">NUTRITION DATABASE</span>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <a href="/" className="nav-link active" aria-current="page">
            <Database size={19} />
            식품 관리
            <span className="nav-dot" />
          </a>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="nav-link">
            <BookOpen size={19} />
            API 문서
            <ExternalLink size={14} />
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="source-symbol">
            <Database size={17} />
            SOURCE DATA
          </div>
          <strong>식품영양성분 DB</strong>
          <p>통합 음식 데이터 · 2023.07.15</p>
          <span>원본 7,683개 식품</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            데이터 관리<span>/</span>
            <strong>식품영양성분</strong>
          </div>
          <button
            className={`auth-button ${adminKey ? 'authenticated' : ''}`}
            onClick={() => {
              if (adminKey) {
                setAdminKey('');
                setNotice(
                  '\uAD00\uB9AC\uC790 \uC778\uC99D\uC744 \uD574\uC81C\uD588\uC2B5\uB2C8\uB2E4.',
                );
              } else {
                setAuthError(void 0);
                setAuthOpen(true);
              }
            }}
          >
            {adminKey ? <ShieldCheck size={16} /> : <LockKeyhole size={16} />}
            {adminKey
              ? '\uAD00\uB9AC\uC790 \xB7 \uC778\uC99D \uD574\uC81C'
              : '\uC77D\uAE30 \uC804\uC6A9 \xB7 \uAD00\uB9AC\uC790 \uC778\uC99D'}
          </button>
        </header>
        <main id="main">
          <section className="page-heading">
            <div>
              <div className="eyebrow">FOOD DATABASE</div>
              <h1>식품영양성분 관리</h1>
              <p>식품을 검색하고 영양성분 정보를 관리하세요.</p>
            </div>
            <button
              className="button primary"
              onClick={() => (adminKey ? setEditor('new') : setAuthOpen(true))}
            >
              <Plus size={18} />
              식품 등록
            </button>
          </section>
          <section className="search-panel" aria-labelledby="search-heading">
            <div className="section-title">
              <h2 id="search-heading">
                <SlidersHorizontal size={17} />
                검색 조건
              </h2>
              <button className="text-button" onClick={reset}>
                <RefreshCw size={14} />
                초기화
              </button>
            </div>
            <form
              className="search-form"
              onSubmit={(event) => {
                event.preventDefault();
                setApplied({ ...filters });
                setPage(1);
              }}
            >
              <label className="name-filter">
                식품명
                <div className="input-icon">
                  <Search size={17} />
                  <input
                    placeholder="예: 김치찌개"
                    value={filters.food_name}
                    onChange={(e) => setFilters({ ...filters, food_name: e.target.value })}
                    maxLength={300}
                  />
                </div>
              </label>
              <label>
                식품코드
                <input
                  placeholder="예: D000006"
                  value={filters.food_code}
                  onChange={(e) => setFilters({ ...filters, food_code: e.target.value })}
                  maxLength={64}
                />
              </label>
              <label>
                조사년도
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="전체 연도"
                  value={filters.research_year}
                  onChange={(e) => setFilters({ ...filters, research_year: e.target.value })}
                />
              </label>
              <label>
                지역 / 제조사
                <input
                  placeholder="예: 서울"
                  value={filters.maker_name}
                  onChange={(e) => setFilters({ ...filters, maker_name: e.target.value })}
                  maxLength={300}
                />
              </label>
              <button className="button search-button">
                <Search size={17} />
                검색
              </button>
            </form>
          </section>
          <section className="results" aria-labelledby="results-heading" aria-busy={loading}>
            <div className="results-toolbar">
              <div className="result-title">
                <h2 id="results-heading">식품 목록</h2>
                <span className="count">{data ? number.format(data.total) : '\u2014'}</span>
                {Object.values(applied).some(Boolean) && (
                  <span className="filter-badge">
                    <Filter size={12} />
                    검색 결과
                  </span>
                )}
              </div>
              <label className="page-size">
                표시 개수
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value="20">20개</option>
                  <option value="50">50개</option>
                  <option value="100">100개</option>
                </select>
              </label>
            </div>
            <ErrorMessage error={error} />
            {Boolean(error) && (
              <button
                className="button secondary retry"
                onClick={() => setRefresh((value) => value + 1)}
              >
                다시 시도
              </button>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="name-column">식품명 / 코드</th>
                    <th>식품군</th>
                    <th>조사년도</th>
                    <th>지역 / 제조사</th>
                    <th className="numeric">
                      열량 <span>(kcal)</span>
                    </th>
                    <th className="action-column">
                      <span className="sr-only">상세 조회</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!error &&
                    data?.items.map((food) => (
                      <tr key={food.id}>
                        <td>
                          <button className="food-name" onClick={() => openDetails(food)}>
                            {food.food_name}
                          </button>
                          <span className="food-code">{food.food_cd}</span>
                        </td>
                        <td>
                          <span className="category">{show(food.group_name)}</span>
                        </td>
                        <td className="tabular">{show(food.research_year)}</td>
                        <td className="maker-cell">{show(food.maker_name)}</td>
                        <td className="numeric calorie">{show(food.calorie)}</td>
                        <td>
                          <button
                            className="icon-button view-button"
                            aria-label={`${food.food_name} \uC0C1\uC138 \uBCF4\uAE30`}
                            onClick={() => openDetails(food)}
                          >
                            <ArrowUpRight size={19} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {loading && (
              <div className="loading-state" role="status">
                식품 정보를 불러오는 중…
              </div>
            )}
            {!loading && !error && data?.items.length === 0 && (
              <div className="empty-state">
                <Search size={32} />
                <h3>검색 결과가 없습니다</h3>
                <p>검색어를 바꾸거나 검색 조건을 초기화해보세요.</p>
                <button className="button secondary" onClick={reset}>
                  검색 초기화
                </button>
              </div>
            )}
            <div className="pagination">
              <span>
                {data?.total
                  ? `${number.format((page - 1) * pageSize + 1)}\u2013${number.format(Math.min(page * pageSize, data.total))} / ${number.format(data.total)}\uAC1C`
                  : '0\uAC1C'}
              </span>
              <div>
                <button
                  className="page-arrow"
                  aria-label="이전 페이지"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="current-page">{page}</span>
                <span className="total-pages">/ {Math.max(1, data?.total_pages ?? 1)}</span>
                <button
                  className="page-arrow"
                  aria-label="다음 페이지"
                  disabled={!data || page >= data.total_pages || loading}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>
          <footer className="page-footer">
            <span>— 는 원본에 값이 없는 항목입니다.</span>
            <a href="/api/docs" target="_blank" rel="noreferrer">
              API 문서 보기
              <ExternalLink size={13} />
            </a>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {notice}
        </div>
      )}
      {authOpen && (
        <Dialog title="관리자 인증" onClose={() => !authBusy && setAuthOpen(false)}>
          <form onSubmit={authenticate}>
            <div className="dialog-body">
              <div className="auth-illustration">
                <KeyRound size={26} />
              </div>
              <p className="auth-description">
                식품 정보를 등록·수정·삭제하려면 관리자 키를 입력하세요.
              </p>
              <ErrorMessage error={authError} />
              <label>
                관리자 키
                <input
                  name="key"
                  type="password"
                  required
                  autoComplete="off"
                  placeholder="관리자 키 입력"
                />
              </label>
              <p className="field-help">키는 현재 화면에서만 유지되며 새로고침하면 해제됩니다.</p>
            </div>
            <div className="dialog-footer">
              <button className="button primary" disabled={authBusy}>
                {authBusy ? '\uD655\uC778 \uC911\u2026' : '\uC778\uC99D'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {selected && !editor && !deleting && (
        <Dialog title="식품 상세 정보" onClose={() => setSelected(void 0)} wide>
          <div className="dialog-body">
            <span className="category">{show(selected.group_name)}</span>
            <h3 className="detail-name">{selected.food_name}</h3>
            <p className="food-code">{selected.food_cd}</p>
            <dl className="metadata">
              <div>
                <dt>조사년도</dt>
                <dd>{show(selected.research_year)}</dd>
              </div>
              <div>
                <dt>지역 / 제조사</dt>
                <dd>{show(selected.maker_name)}</dd>
              </div>
              <div className="full-width">
                <dt>자료출처</dt>
                <dd>{show(selected.ref_name)}</dd>
              </div>
              {selected.source_notes && (
                <div className="full-width">
                  <dt>원본 수치 참고</dt>
                  <dd>{selected.source_notes}</dd>
                </div>
              )}
            </dl>
            <h3>영양성분</h3>
            <dl className="nutrition-grid">
              {nutrientFields.map((field) => (
                <div key={field}>
                  <dt>{nutrientLabels[field][0]}</dt>
                  <dd>
                    {show(selected[field])}
                    <span>
                      {field === 'serving_size'
                        ? show(selected.serving_unit)
                        : nutrientLabels[field][1]}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="dialog-footer between">
            <button
              className="button danger-text"
              disabled={!adminKey}
              onClick={() => {
                setDeleting(selected);
                setDeleteError(void 0);
              }}
            >
              <Trash2 size={16} />
              삭제
            </button>
            <button
              className="button primary"
              disabled={!adminKey}
              onClick={() => setEditor(selected)}
            >
              <Pencil size={16} />
              수정
            </button>
          </div>
        </Dialog>
      )}
      {editor && (
        <FoodForm
          food={editor === 'new' ? void 0 : editor}
          adminKey={adminKey}
          onClose={() => setEditor(void 0)}
          onSaved={saved}
        />
      )}
      {deleting && (
        <Dialog title="식품 삭제" onClose={() => !deleteBusy && setDeleting(void 0)}>
          <div className="dialog-body">
            <ErrorMessage error={deleteError} />
            <p>
              <strong>{deleting.food_name}</strong>을 삭제할까요?
            </p>
            <p className="field-help">삭제한 식품 정보는 복구할 수 없습니다.</p>
          </div>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={deleteBusy}
              onClick={() => setDeleting(void 0)}
            >
              취소
            </button>
            <button className="button danger" disabled={deleteBusy} onClick={remove}>
              {deleteBusy ? '\uC0AD\uC81C \uC911\u2026' : '\uC0AD\uC81C'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

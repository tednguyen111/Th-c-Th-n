import React, { useEffect, useState, useCallback } from 'react';
import { LogOut, RefreshCw, X } from 'lucide-react';

interface FoodScores {
  ngon: number;
  bo: number;
  gia: number;
  no: number;
  khoangcach: number;
}

interface FoodItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  distance: number;
  image: string;
  adminScores: FoodScores;
  scores: FoodScores;
  reviewCount?: number;
}

interface TeamItem {
  id: number;
  teamName: string;
  foodId: number;
  foodName: string;
  captainName: string;
  members: string[];
  qrUrl: string | null;
  status: 'open' | 'closed';
  createdAt: string;
}

interface FoodFeedback {
  id: number;
  foodId: number;
  foodName: string;
  userName: string;
  scores: FoodScores;
  comment: string;
  createdAt: string;
}

interface UserProfile {
  name: string;
  elo: number;
}

const calcAvg = (s: FoodScores) =>
  ((s.ngon + s.bo + s.gia + s.no + s.khoangcach) / 5).toFixed(1);

const formatVND = (n: number) => `${Number(n).toLocaleString('vi-VN')}₫`;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

const categoryLabel = (cat: string): string => {
  if (cat === 'pho') return 'Phở';
  if (cat === 'bun') return 'Bún';
  if (cat === 'com') return 'Cơm';
  if (cat === 'mien') return 'Miến';
  return cat;
};

const SCORE_FIELDS: { key: keyof FoodScores; label: string }[] = [
  { key: 'ngon', label: 'Ngon' },
  { key: 'bo', label: 'Độ Bổ' },
  { key: 'gia', label: 'Giá Hợp Lý' },
  { key: 'no', label: 'Khẩu Phần' },
  { key: 'khoangcach', label: 'Khoảng Cách' },
];

export function AdminPanel() {
  const [isAuth, setIsAuth] = useState<boolean>(
    () => sessionStorage.getItem('fr_admin_auth') === '1'
  );
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loadingFoods, setLoadingFoods] = useState<boolean>(false);

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);

  const [feedbacks, setFeedbacks] = useState<FoodFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState<boolean>(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  const [feedbackFoodFilter, setFeedbackFoodFilter] = useState<number | 'all'>('all');

  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editScores, setEditScores] = useState<FoodScores>({
    ngon: 8,
    bo: 8,
    gia: 8,
    no: 8,
    khoangcach: 8,
  });
  const [savingScores, setSavingScores] = useState<boolean>(false);

  const fetchFoods = useCallback(async () => {
    setLoadingFoods(true);
    try {
      const res = await fetch('/api/foods');
      const data: FoodItem[] = await res.json();
      setFoods(data);
    } catch {
      // ignore
    } finally {
      setLoadingFoods(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch('/api/teams');
      const data: TeamItem[] = await res.json();
      setTeams(data);
    } catch {
      // ignore
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const fetchFeedbacks = useCallback(async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch('/api/feedbacks');
      if (res.ok) {
        const data: FoodFeedback[] = await res.json();
        setFeedbacks(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFeedbacks(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/leaderboard?period=all');
      const data = await res.json();
      setUsers(data.leaderboard || data);
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchAll = useCallback(() => {
    if (!isAuth) return;
    fetchFoods();
    fetchTeams();
    fetchFeedbacks();
    fetchUsers();
  }, [isAuth, fetchFoods, fetchTeams, fetchFeedbacks, fetchUsers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin2024') {
      sessionStorage.setItem('fr_admin_auth', '1');
      setIsAuth(true);
      setAuthError('');
    } else {
      setAuthError('Mật khẩu không đúng. Vui lòng thử lại.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('fr_admin_auth');
    setIsAuth(false);
  };

  const handleSaveScores = async () => {
    if (!editingFood) return;
    setSavingScores(true);
    try {
      const res = await fetch(`/api/admin/foods/${editingFood.id}/scores`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminScores: editScores }),
      });
      if (res.ok) {
        const updated: FoodItem = await res.json();
        setFoods((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        setEditingFood(null);
      }
    } catch {
      // ignore
    } finally {
      setSavingScores(false);
    }
  };

  const handleCloseTeam = async (teamId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/close`, { method: 'PUT' });
      if (res.ok) {
        const updated: TeamItem = await res.json();
        setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch {
      // ignore
    }
  };

  // ── PASSWORD GATE ──
  if (!isAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-8 w-full max-w-sm shadow-lg">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white text-center mb-1">
            Admin Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-slate-400 text-center mb-6">
            Nhập mật khẩu để tiếp tục
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Mật khẩu"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
            />
            {authError && (
              <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredFeedbacks =
    feedbackFoodFilter === 'all'
      ? feedbacks
      : feedbacks.filter((fb) => fb.foodId === feedbackFoodFilter);

  // ── ADMIN DASHBOARD ──
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
          ⚙ Admin Dashboard
        </h2>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* ── SECTION A: STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tổng Món Ăn', value: foods.length },
          { label: 'Teams Đang Mở', value: teams.filter((t) => t.status === 'open').length },
          { label: 'Tổng Feedback', value: feedbacks.length },
          { label: 'Người Dùng', value: users.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#282D3A] p-5"
          >
            <p className="text-xs text-zinc-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white font-mono-tabular">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── SECTION B: QUẢN LÝ MÓN ĂN ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Quản lý Món Ăn</h3>
          <button
            type="button"
            onClick={fetchFoods}
            disabled={loadingFoods}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFoods ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#282D3A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Giá
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Danh mục
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Đ.TB Cộng đồng
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Số review
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {foods.map((food) => (
                <tr
                  key={food.id}
                  className="border-b border-black/4 dark:border-white/6 even:bg-zinc-50/50 dark:even:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    {food.name}
                  </td>
                  <td className="px-4 py-3 font-mono-tabular text-zinc-700 dark:text-slate-200">
                    {formatVND(food.price)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                    {categoryLabel(food.category)}
                  </td>
                  <td className="px-4 py-3 font-mono-tabular text-zinc-700 dark:text-slate-200">
                    {calcAvg(food.scores)}
                  </td>
                  <td className="px-4 py-3 font-mono-tabular text-zinc-700 dark:text-slate-200">
                    {food.reviewCount || 0}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFood(food);
                        setEditScores({ ...food.adminScores });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#E04F16] hover:bg-[#C43E0B] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Chỉnh sửa điểm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION C: QUẢN LÝ TEAMS ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Quản lý Teams</h3>
          <button
            type="button"
            onClick={fetchTeams}
            disabled={loadingTeams}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTeams ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#282D3A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Tên Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Món Ăn
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Captain
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Thành Viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Trạng Thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Ngày Tạo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-b border-black/4 dark:border-white/6 even:bg-zinc-50/50 dark:even:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    {team.teamName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{team.foodName}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-slate-200">
                    {team.captainName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                    {team.members.length > 0 ? team.members.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        team.status === 'open'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-slate-300'
                      }`}
                    >
                      {team.status === 'open' ? 'Mở' : 'Đã đóng'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono-tabular text-zinc-600 dark:text-slate-300">
                    {formatDate(team.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {team.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleCloseTeam(team.id)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#363D4E] hover:bg-zinc-200 dark:hover:bg-slate-600 text-xs font-semibold text-zinc-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Đóng Team
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION D: TẤT CẢ FEEDBACK ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Tất cả Feedback</h3>
          <select
            aria-label="Lọc feedback theo món ăn"
            value={feedbackFoodFilter}
            onChange={(e) =>
              setFeedbackFoodFilter(
                e.target.value === 'all' ? 'all' : Number(e.target.value)
              )
            }
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 text-xs font-medium text-zinc-700 dark:text-slate-200 focus:outline-none focus:border-[#E04F16]"
          >
            <option value="all">Tất cả món</option>
            {foods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#282D3A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Món Ăn
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Điểm TB
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Nhận Xét
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Ngày
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingFeedbacks ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400 text-xs">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400 text-xs">
                    Chưa có feedback nào.
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((fb) => (
                  <tr
                    key={fb.id}
                    className="border-b border-black/4 dark:border-white/6 even:bg-zinc-50/50 dark:even:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                      {fb.userName}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{fb.foodName}</td>
                    <td className="px-4 py-3 font-mono-tabular text-[#E04F16] dark:text-[#FF7A45] font-bold">
                      {calcAvg(fb.scores)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300 max-w-xs">
                      {fb.comment.length > 80 ? `${fb.comment.slice(0, 80)}…` : fb.comment}
                    </td>
                    <td className="px-4 py-3 font-mono-tabular text-zinc-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(fb.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CHỈNH SỬA ĐIỂM ADMIN ── */}
      {editingFood && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#282D3A] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Chỉnh điểm Admin: {editingFood.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {SCORE_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-slate-200">
                      {label}
                    </label>
                    <span className="font-mono-tabular text-sm font-bold text-[#E04F16] dark:text-[#FF7A45]">
                      {editScores[key]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.5}
                      value={editScores[key]}
                      onChange={(e) =>
                        setEditScores((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 accent-[#E04F16] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={editScores[key]}
                      onChange={(e) =>
                        setEditScores((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="w-16 px-2 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-center font-mono-tabular text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/12 text-xs font-semibold text-zinc-600 dark:text-slate-300 cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={savingScores}
                onClick={handleSaveScores}
                className="flex-1 py-2.5 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {savingScores ? 'Đang lưu...' : 'Lưu điểm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

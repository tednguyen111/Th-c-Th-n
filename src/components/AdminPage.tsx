import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Users,
  Utensils,
  MessageSquare,
  Mail,
  Award,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Upload,
  X,
  Sliders,
  LogOut,
} from 'lucide-react';
import { DonutScoreChart, formatHalfStepScore, Radar360Scores } from './DonutScoreChart';
import { OptimizedImage } from './OptimizedImage';

export interface AdminFoodItem {
  id: number;
  name: string;
  category: 'pho' | 'bun' | 'com' | 'mien';
  description: string;
  price: number;
  distance: number;
  image: string;
  adminScores: Radar360Scores;
  scores: Radar360Scores;
  reviewCount?: number;
}

export interface AdminUserProfile {
  name: string;
  elo: number;
  mealsCount: number;
  teamsHosted: number;
  teamsJoined: number;
  feedbacksCount: number;
  totalSpent: number;
  titles: string[];
}

export interface AdminTeamItem {
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

export interface AdminFeedbackItem {
  id: number;
  foodId: number;
  foodName: string;
  userName: string;
  scores: Radar360Scores;
  comment: string;
  createdAt: string;
}

export interface AdminContactItem {
  id: number;
  name: string;
  email: string;
  subject: 'gop-y-mon' | 'de-xuat-quan' | 'hop-tac' | 'bao-loi';
  dishOrPlace?: string;
  message: string;
  createdAt: string;
}

interface AdminPageProps {
  onDataChanged: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type AdminSection = 'foods' | 'users' | 'teams' | 'moderation';

const snapToHalf = (n: number) => Math.round(n * 2) / 2;
const formatVND = (n: number) => `${Number(n).toLocaleString('vi-VN')}₫`;
const calcAvg = (s: Radar360Scores) =>
  formatHalfStepScore((s.ngon + s.bo + s.gia + s.no + s.khoangcach) / 5);

const CATEGORY_LABELS: Record<AdminFoodItem['category'], string> = {
  pho: 'Phở',
  bun: 'Bún',
  com: 'Cơm',
  mien: 'Miến & Trộn',
};

const PRESET_IMAGES = [
  { label: 'Phở Bò', url: '/src/assets/images/food_pho_bo_1791445652067.jpg' },
  { label: 'Bún Chả', url: '/src/assets/images/food_bun_cha_1791445662891.jpg' },
  { label: 'Cơm Tấm', url: '/src/assets/images/food_com_tam_1791445675670.jpg' },
  { label: 'Miến Ngan', url: '/src/assets/images/food_mien_ngan_1791445686265.jpg' },
  { label: 'Bún Bò Huế', url: '/src/assets/images/food_bun_bo_hue_1791445697699.jpg' },
];

export function AdminPage({ onDataChanged, showToast }: AdminPageProps) {
  // ── PASSWORD GATE ──
  const [isAuth, setIsAuth] = useState<boolean>(
    () => sessionStorage.getItem('fr_admin_auth') === '1'
  );
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

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
    setPasswordInput('');
  };

  const [section, setSection] = useState<AdminSection>('foods');
  const [loading, setLoading] = useState<boolean>(true);

  const [foods, setFoods] = useState<AdminFoodItem[]>([]);
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [teams, setTeams] = useState<AdminTeamItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackItem[]>([]);
  const [contacts, setContacts] = useState<AdminContactItem[]>([]);

  // Search in Admin Foods
  const [foodSearch, setFoodSearch] = useState<string>('');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all');

  // Dish Create / Edit Modal state
  const [dishModalOpen, setDishModalOpen] = useState<boolean>(false);
  const [editingFood, setEditingFood] = useState<AdminFoodItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<AdminFoodItem['category']>('pho');
  const [formPrice, setFormPrice] = useState<number>(45000);
  const [formDistance, setFormDistance] = useState<number>(0.5);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formImage, setFormImage] = useState<string>(PRESET_IMAGES[0].url);
  const [formAdminScores, setFormAdminScores] = useState<Radar360Scores>({
    ngon: 9,
    bo: 8.5,
    gia: 8.5,
    no: 9,
    khoangcach: 9,
  });
  const [savingDish, setSavingDish] = useState<boolean>(false);

  // User AP Adjustment Form state
  const [targetUserName, setTargetUserName] = useState<string>('');
  const [pointsDelta, setPointsDelta] = useState<number>(20);
  const [pointsReason, setPointsReason] = useState<string>('Thưởng hoạt động tích cực tuần này');
  const [adjustingPoints, setAdjustingPoints] = useState<boolean>(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setFoods(data.foods || []);
        setUsers(data.users || []);
        setTeams(data.teams || []);
        setFeedbacks(data.feedbacks || []);
        setContacts(data.contacts || []);
        if (!targetUserName && data.users?.length > 0) {
          setTargetUserName(data.users[0].name);
        }
      }
    } catch {
      showToast('Không thể tải dữ liệu trang Admin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const openCreateDishModal = (prefillName = '', prefillDesc = '') => {
    setEditingFood(null);
    setFormName(prefillName);
    setFormCategory('pho');
    setFormPrice(45000);
    setFormDistance(0.5);
    setFormDescription(prefillDesc);
    setFormImage(PRESET_IMAGES[0].url);
    setFormAdminScores({
      ngon: 9,
      bo: 8.5,
      gia: 8.5,
      no: 9,
      khoangcach: 9,
    });
    setDishModalOpen(true);
  };

  const openEditDishModal = (food: AdminFoodItem) => {
    setEditingFood(food);
    setFormName(food.name);
    setFormCategory(food.category);
    setFormPrice(food.price);
    setFormDistance(food.distance);
    setFormDescription(food.description);
    setFormImage(food.image);
    setFormAdminScores({ ...(food.adminScores || food.scores) });
    setDishModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setFormImage(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formName.trim().length < 2) {
      showToast('Tên món ăn phải có ít nhất 2 ký tự.', 'error');
      return;
    }

    setSavingDish(true);
    try {
      const url = editingFood ? `/api/admin/foods/${editingFood.id}` : '/api/admin/foods';
      const method = editingFood ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory,
          price: Number(formPrice),
          distance: Number(formDistance),
          description: formDescription.trim(),
          image: formImage,
          adminScores: formAdminScores,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Không thể lưu món ăn.', 'error');
        return;
      }

      showToast(
        editingFood
          ? `Đã cập nhật "${data.name}" và điểm 360 Admin!`
          : `Đã thêm món mới "${data.name}"!`,
        'success'
      );
      setDishModalOpen(false);
      await fetchOverview();
      onDataChanged();
    } catch {
      showToast('Lỗi kết nối khi lưu món ăn.', 'error');
    } finally {
      setSavingDish(false);
    }
  };

  const handleDeleteDish = async (food: AdminFoodItem) => {
    try {
      const res = await fetch(`/api/admin/foods/${food.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Đã xóa món "${food.name}".`, 'info');
        await fetchOverview();
        onDataChanged();
      }
    } catch {
      showToast('Không thể xóa món ăn.', 'error');
    }
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = targetUserName.trim().toUpperCase();
    if (!cleanName) {
      showToast('Vui lòng nhập hoặc chọn tên thành viên.', 'error');
      return;
    }
    if (!pointsDelta || pointsDelta === 0) {
      showToast('Số điểm điều chỉnh phải khác 0.', 'error');
      return;
    }

    setAdjustingPoints(true);
    try {
      const res = await fetch('/api/admin/users/adjust-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: cleanName,
          points: Number(pointsDelta),
          reason: pointsReason.trim() || 'Admin điều chỉnh điểm AP',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Không thể điều chỉnh điểm.', 'error');
        return;
      }

      showToast(
        `Đã ${pointsDelta > 0 ? `cộng +${pointsDelta}` : `trừ ${pointsDelta}`} AP cho ${cleanName}!`,
        'success'
      );
      await fetchOverview();
      onDataChanged();
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setAdjustingPoints(false);
    }
  };

  const handleDeleteUser = async (userName: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userName)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Đã xóa thành viên ${userName}.`, 'info');
        await fetchOverview();
        onDataChanged();
      }
    } catch {
      showToast('Không thể xóa thành viên.', 'error');
    }
  };

  const handleToggleTeam = async (team: AdminTeamItem) => {
    try {
      const res = await fetch(`/api/admin/teams/${team.id}/toggle`, { method: 'PUT' });
      if (res.ok) {
        const updated = await res.json();
        showToast(
          `Đã chuyển trạng thái "${updated.teamName}" sang ${
            updated.status === 'open' ? 'Đang mở' : 'Đã đóng'
          }.`,
          'info'
        );
        await fetchOverview();
        onDataChanged();
      }
    } catch {
      showToast('Không thể đổi trạng thái team.', 'error');
    }
  };

  const handleDeleteTeam = async (team: AdminTeamItem) => {
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Đã xóa team "${team.teamName}".`, 'info');
        await fetchOverview();
        onDataChanged();
      }
    } catch {
      showToast('Không thể xóa team.', 'error');
    }
  };

  const handleDeleteFeedback = async (fb: AdminFeedbackItem) => {
    try {
      const res = await fetch(`/api/admin/feedbacks/${fb.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Đã xóa feedback của ${fb.userName} và cập nhật lại điểm 360.`, 'info');
        await fetchOverview();
        onDataChanged();
      }
    } catch {
      showToast('Không thể xóa feedback.', 'error');
    }
  };

  const handleDeleteContact = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Đã xóa mục liên hệ.', 'info');
        await fetchOverview();
        onDataChanged();
      }
    } catch {
      showToast('Không thể xóa liên hệ.', 'error');
    }
  };

  const filteredFoods = foods.filter((f) => {
    const matchesCat = foodCategoryFilter === 'all' || f.category === foodCategoryFilter;
    const matchesSearch =
      !foodSearch.trim() ||
      f.name.toLowerCase().includes(foodSearch.trim().toLowerCase()) ||
      f.description.toLowerCase().includes(foodSearch.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalAP = users.reduce((sum, u) => sum + u.elo, 0);
  const openTeamsCount = teams.filter((t) => t.status === 'open').length;

  // ── RENDER: PASSWORD GATE ──
  if (!isAuth) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#E04F16]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚙</span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Dashboard</h2>
              <p className="text-sm text-zinc-500 dark:text-slate-400 mt-1.5">
                Nhập mật khẩu quản trị để tiếp tục
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu Admin..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16] transition-colors"
                />
              </div>
              {authError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  {authError}
                </p>
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
      </div>
    );
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-1.5">
              Bảng Điều Khiển Quản Trị Viên
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
              Admin Dashboard — Quản Lý Hệ Thống 360
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-slate-300 mt-1">
              Thêm/sửa món ăn, chấm điểm Đánh giá 360 Admin (thang điểm chẵn & 0.5), điều chỉnh AP thành viên và kiểm duyệt nội dung.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-red-500 hover:text-red-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
            <button
              type="button"
              onClick={fetchOverview}
              className="px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới dữ liệu</span>
            </button>
            <button
              type="button"
              onClick={() => openCreateDishModal()}
              className="px-4 py-2.5 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Món Ăn Mới</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Tổng Món Ăn</span>
              <Utensils className="w-4 h-4 text-[#E04F16]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-zinc-900 dark:text-white">
              {foods.length}
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">
              Có biểu đồ 360 Admin & Cộng đồng
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Thành Viên & AP</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-zinc-900 dark:text-white">
              {users.length}{' '}
              <span className="text-sm font-semibold text-[#E04F16] dark:text-[#FF7A45]">
                ({totalAP} AP)
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">
              Khởi điểm 0 AP · Thưởng/phạt tức thì
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Team Đi Ăn</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-zinc-900 dark:text-white">
              {openTeamsCount}{' '}
              <span className="text-sm font-normal text-zinc-400">/ {teams.length} team</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">
              Giới hạn 1 người / 1 team mở
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Feedback & Góp Ý
              </span>
              <MessageSquare className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-zinc-900 dark:text-white">
              {feedbacks.length}{' '}
              <span className="text-sm font-normal text-zinc-400">
                · {contacts.length} thư
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1">
              Điểm chuẩn hóa bậc 0.5
            </p>
          </div>
        </div>

        {/* Admin Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/8 dark:border-white/10 pb-3">
          {[
            {
              id: 'foods' as AdminSection,
              label: `Món Ăn & Điểm 360 Admin (${foods.length})`,
              icon: Sliders,
            },
            {
              id: 'users' as AdminSection,
              label: `Thành Viên & Điểm AP (${users.length})`,
              icon: Award,
            },
            {
              id: 'teams' as AdminSection,
              label: `Quản Lý Team (${teams.length})`,
              icon: Users,
            },
            {
              id: 'moderation' as AdminSection,
              label: `Feedback & Liên Hệ (${feedbacks.length + contacts.length})`,
              icon: Mail,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#E04F16] text-white shadow-xs'
                    : 'bg-white dark:bg-[#282D3A] text-zinc-600 dark:text-slate-300 border border-black/6 dark:border-white/10 hover:border-[#E04F16]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── SECTION 1: FOODS & ADMIN 360 SCORES ── */}
        {section === 'foods' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EFECE6] dark:bg-[#282D3A] border border-black/5 dark:border-white/8">
                {[
                  { id: 'all', label: 'Tất Cả' },
                  { id: 'pho', label: 'Phở' },
                  { id: 'bun', label: 'Bún' },
                  { id: 'mien', label: 'Miến & Trộn' },
                  { id: 'com', label: 'Cơm' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFoodCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      foodCategoryFilter === cat.id
                        ? 'bg-white dark:bg-[#1E222B] text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  placeholder="Tìm món ăn để sửa điểm 360..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black/6 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-400 bg-[#FAF8F5] dark:bg-[#222733]">
                      <th className="py-3.5 px-4">Món Ăn</th>
                      <th className="py-3.5 px-4">Danh Mục</th>
                      <th className="py-3.5 px-4">Giá & Cách</th>
                      <th className="py-3.5 px-4">Điểm 360 Admin (Vàng Chanh)</th>
                      <th className="py-3.5 px-4">TB Cộng Đồng (Cam)</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/6 dark:divide-white/8 text-sm">
                    {filteredFoods.map((food) => {
                      const adminS = food.adminScores || food.scores;
                      return (
                        <tr
                          key={food.id}
                          className="hover:bg-black/2 dark:hover:bg-white/4 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={food.image}
                                alt={food.name}
                                className="w-12 h-10 rounded-lg object-cover shrink-0 bg-zinc-200 dark:bg-slate-700"
                              />
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-white">
                                  {food.name}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-slate-400 line-clamp-1 max-w-xs">
                                  {food.description}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFECE6] dark:bg-[#1E222B] text-zinc-700 dark:text-slate-200">
                              {CATEGORY_LABELS[food.category] || food.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                            <div className="font-bold text-[#E04F16] dark:text-[#FF7A45]">
                              {formatVND(food.price)}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-slate-400">
                              {food.distance} km
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono-tabular">
                            <div className="font-bold text-zinc-900 dark:text-[#E4F222]">
                              TB {calcAvg(adminS)} / 10
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-slate-400">
                              Ngon {formatHalfStepScore(adminS.ngon)} · Bổ{' '}
                              {formatHalfStepScore(adminS.bo)} · Rẻ{' '}
                              {formatHalfStepScore(adminS.gia)} · No{' '}
                              {formatHalfStepScore(adminS.no)} · Gần{' '}
                              {formatHalfStepScore(adminS.khoangcach)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                            <div className="font-bold text-[#E04F16] dark:text-[#FF7A45]">
                              TB {calcAvg(food.scores)} / 10
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-slate-400">
                              {food.reviewCount || 1} lượt đánh giá
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditDishModal(food)}
                                className="px-3 py-1.5 rounded-lg bg-[#E04F16]/10 hover:bg-[#E04F16] text-[#E04F16] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa & Chấm 360</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDish(food)}
                                aria-label={`Xóa ${food.name}`}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: USERS & ACTIVITY POINTS (AP) ── */}
        {section === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Adjust AP Form */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleAdjustPoints}
                className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-6 space-y-5"
              >
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Điều Chỉnh Điểm Hoạt Động (AP)
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-slate-300 mt-1">
                    Thưởng thêm AP hoặc trừ điểm thành viên. Có thể nhập tên thành viên mới (bắt đầu từ 0 AP).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                    Chọn hoặc nhập tên thành viên
                  </label>
                  <input
                    type="text"
                    value={targetUserName}
                    onChange={(e) => setTargetUserName(e.target.value.toUpperCase())}
                    placeholder="VD: MINH ANH"
                    list="admin-users-datalist"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 text-sm font-bold uppercase text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                  />
                  <datalist id="admin-users-datalist">
                    {users.map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name} ({u.elo} AP)
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-2">
                    Mức cộng / trừ điểm nhanh
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[15, 20, 30, 50, -15, -30].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPointsDelta(val)}
                        className={`py-2 rounded-lg font-mono-tabular text-xs font-bold border transition-colors cursor-pointer ${
                          pointsDelta === val
                            ? 'bg-[#E04F16] text-white border-[#E04F16]'
                            : val > 0
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-300'
                        }`}
                      >
                        {val > 0 ? `+${val} AP` : `${val} AP`}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    step={5}
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 font-mono-tabular text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                    Lý do điều chỉnh
                  </label>
                  <input
                    type="text"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    placeholder="VD: Thưởng Captain nhiệt huyết tuần này"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adjustingPoints}
                  className="w-full py-3 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {adjustingPoints
                    ? 'Đang cập nhật...'
                    : `Xác nhận ${pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta} AP`}
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="lg:col-span-7 bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 overflow-hidden">
              <div className="p-5 border-b border-black/6 dark:border-white/10 flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Danh Sách Thành Viên ({users.length})
                </h3>
                <span className="text-xs text-zinc-500 dark:text-slate-400">
                  Bấm vào tên để chọn điều chỉnh AP
                </span>
              </div>

              <div className="divide-y divide-black/6 dark:divide-white/8">
                {users.map((u, idx) => (
                  <div
                    key={u.name}
                    onClick={() => setTargetUserName(u.name)}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-black/2 dark:hover:bg-white/4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#EFECE6] dark:bg-[#1E222B] font-mono-tabular text-xs font-bold flex items-center justify-center text-zinc-700 dark:text-slate-200 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 dark:text-white truncate">
                          {u.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-slate-400">
                          Captain: {u.teamsHosted} · Join: {u.teamsJoined} · Feedback:{' '}
                          {u.feedbacksCount}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-tabular text-sm font-extrabold text-[#E04F16] dark:text-[#FF7A45]">
                        {u.elo} AP
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(u.name);
                        }}
                        aria-label={`Xóa thành viên ${u.name}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 3: TEAMS MANAGEMENT ── */}
        {section === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {teams.length === 0 ? (
              <div className="col-span-full p-10 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 text-center text-sm text-zinc-500">
                Hiện chưa có team nào trong hệ thống.
              </div>
            ) : (
              teams.map((team) => {
                const isOpen = team.status === 'open';
                return (
                  <div
                    key={team.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase ${
                            isOpen
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-400 dark:text-slate-500'
                          }`}
                        >
                          {isOpen ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {isOpen ? 'Đang mở' : 'Đã đóng'}
                        </span>

                        <span className="font-mono-tabular text-xs text-zinc-400">
                          ID #{team.id}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {team.teamName}
                      </h3>
                      <p className="text-xs font-semibold text-[#E04F16] dark:text-[#FF7A45]">
                        Món: {team.foodName}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-slate-300">
                        Captain: <strong>{team.captainName}</strong> · Thành viên (
                        {team.members.length}):{' '}
                        {team.members.length > 0 ? team.members.join(', ') : 'Chưa có'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-black/6 dark:border-white/10 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTeam(team)}
                        className="px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/12 text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] transition-colors cursor-pointer"
                      >
                        {isOpen ? 'Đóng Team này' : 'Mở lại Team'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team)}
                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Team</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── SECTION 4: MODERATION (FEEDBACKS & CONTACTS) ── */}
        {section === 'moderation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Community Feedbacks Moderation */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Kiểm Duyệt Feedback Món Ăn ({feedbacks.length})
              </h2>
              {feedbacks.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 text-center text-sm text-zinc-500">
                  Chưa có feedback nào.
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {fb.userName}
                        </span>
                        <span className="mx-2 text-zinc-400">·</span>
                        <span className="text-xs font-semibold text-[#E04F16] dark:text-[#FF7A45]">
                          {fb.foodName}
                        </span>
                        <span className="ml-2 font-mono-tabular text-xs font-bold text-zinc-600 dark:text-slate-300">
                          (TB {calcAvg(fb.scores)}/10)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteFeedback(fb)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>

                    <p className="text-sm text-zinc-700 dark:text-slate-200">{fb.comment}</p>

                    <div className="text-xs font-mono-tabular text-zinc-500 dark:text-slate-400">
                      Ngon {formatHalfStepScore(fb.scores.ngon)} · Bổ{' '}
                      {formatHalfStepScore(fb.scores.bo)} · Rẻ{' '}
                      {formatHalfStepScore(fb.scores.gia)} · No{' '}
                      {formatHalfStepScore(fb.scores.no)} · Gần{' '}
                      {formatHalfStepScore(fb.scores.khoangcach)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Contact & Dish Suggestions Inbox */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Hộp Thư Đề Xuất & Liên Hệ ({contacts.length})
              </h2>
              {contacts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 text-center text-sm text-zinc-500">
                  Chưa có thư liên hệ hoặc đề xuất quán mới nào.
                </div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white">
                          {c.name}{' '}
                          <span className="font-normal text-xs text-zinc-500">({c.email})</span>
                        </div>
                        {c.dishOrPlace && (
                          <div className="text-xs font-semibold text-[#E04F16] dark:text-[#FF7A45] mt-0.5">
                            Đề xuất: {c.dishOrPlace}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-slate-300">
                      {c.message}
                    </p>

                    {c.dishOrPlace && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => openCreateDishModal(c.dishOrPlace || '', c.message)}
                          className="px-3 py-1.5 rounded-lg bg-[#E04F16]/10 hover:bg-[#E04F16] text-[#E04F16] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Duyệt tạo Món Ăn mới</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: ADD / EDIT DISH & ADMIN 360 SCORES (0.5 STEP) ── */}
      {dishModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDishModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/10 dark:border-white/12 max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/6 dark:border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {editingFood
                    ? `Chỉnh sửa Món & Điểm 360 Admin: ${editingFood.name}`
                    : 'Thêm Món Ăn Mới & Chấm Điểm 360 Admin'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-slate-300 mt-0.5">
                  Tất cả điểm số thẩm định của Admin đều làm tròn theo bậc 0.5 (7, 7.5, 8, 8.5, 9...)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDishModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left column: Dish metadata */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                    Tên món ăn *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Phở Bò Tái Lăn Lý Quốc Sư"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                      Danh mục
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) =>
                        setFormCategory(e.target.value as AdminFoodItem['category'])
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                    >
                      <option value="pho">Phở</option>
                      <option value="bun">Bún</option>
                      <option value="com">Cơm</option>
                      <option value="mien">Miến & Trộn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                      Giá (VNĐ)
                    </label>
                    <input
                      type="number"
                      step={1000}
                      min={5000}
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 font-mono-tabular text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                      Cách (km)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      value={formDistance}
                      onChange={(e) => setFormDistance(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 font-mono-tabular text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
                    Mô tả hương vị & địa chỉ
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Mô tả chi tiết về nước dùng, topping, địa chỉ quán..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/12 dark:border-white/15 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                  />
                </div>

                {/* Dish Image Picker / Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200">
                    Hình ảnh món ăn (Chọn mẫu có sẵn hoặc tải ảnh lên)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        onClick={() => setFormImage(img.url)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          formImage === img.url
                            ? 'bg-[#E04F16] text-white border-[#E04F16]'
                            : 'bg-[#FAF8F5] dark:bg-[#1E222B] border-black/10 dark:border-white/12 text-zinc-600 dark:text-slate-300'
                        }`}
                      >
                        {img.label}
                      </button>
                    ))}
                    <label className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-dashed border-[#E04F16] text-[#E04F16] dark:text-[#FF7A45] inline-flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-black/8 dark:border-white/10">
                    <OptimizedImage
                      src={formImage}
                      alt={formName || 'Preview'}
                      aspectClass="aspect-[16/9]"
                    />
                  </div>
                </div>
              </div>

              {/* Right column: Admin 360 0.5-Step Sliders + Live Circular Chart Preview */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/6 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-slate-200">
                      Chấm Điểm 360 — Admin (Bước 0.5)
                    </span>
                    <span className="font-mono-tabular text-xs font-extrabold text-[#E04F16] dark:text-[#E4F222]">
                      TB: {calcAvg(formAdminScores)} / 10
                    </span>
                  </div>

                  {(
                    [
                      { key: 'ngon', label: 'Độ Ngon (Hương vị)' },
                      { key: 'bo', label: 'Độ Bổ (Dinh dưỡng)' },
                      { key: 'gia', label: 'Giá Hợp Lý (Rẻ)' },
                      { key: 'no', label: 'Độ No (Khẩu phần)' },
                      { key: 'khoangcach', label: 'Độ Gần (Di chuyển)' },
                    ] as { key: keyof Radar360Scores; label: string }[]
                  ).map((criterion) => (
                    <div key={criterion.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700 dark:text-slate-300">
                          {criterion.label}
                        </span>
                        <span className="font-mono-tabular font-bold text-zinc-900 dark:text-white">
                          {formatHalfStepScore(formAdminScores[criterion.key])} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={formAdminScores[criterion.key]}
                        onChange={(e) =>
                          setFormAdminScores((prev) => ({
                            ...prev,
                            [criterion.key]: snapToHalf(Number(e.target.value)),
                          }))
                        }
                        className="w-full accent-[#E04F16] cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Live 360 Chart Preview */}
                <DonutScoreChart
                  title="Xem Trước Đánh giá 360 — Admin"
                  subtitle="Biểu đồ hiển thị cho người dùng (Tông Vàng Chanh)"
                  scores={formAdminScores}
                  accentColor="lime"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDishModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-black/12 dark:border-white/15 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-slate-300 cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={savingDish}
                    className="flex-1 py-3 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {savingDish
                      ? 'Đang lưu...'
                      : editingFood
                      ? 'Lưu Cập Nhật Món'
                      : 'Tạo Món Ăn Mới'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

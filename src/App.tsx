/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  Users,
  Trophy,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Upload,
  RefreshCw,
  Utensils,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { OptimizedImage } from './components/OptimizedImage';
import { DonutScoreChart, formatHalfStepScore } from './components/DonutScoreChart';
import { LeaderboardPodium } from './components/LeaderboardPodium';
import { AdminPanel } from './components/AdminPanel';

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
  category: 'pho' | 'bun' | 'com' | 'mien';
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

interface UserProfile {
  name: string;
  elo: number; // Activity Points (starts at 0)
  mealsCount: number;
  teamsHosted: number;
  teamsJoined: number;
  feedbacksCount: number;
  totalSpent: number;
  titles: string[];
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

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: 'gop-y-mon' | 'de-xuat-quan' | 'hop-tac' | 'bao-loi';
  dishOrPlace?: string;
  message: string;
  createdAt: string;
}

type TabId = 'foods' | 'teams' | 'leaderboard' | 'feedback' | 'wheel' | 'contact' | 'admin';

const WHEEL_COLORS = [
  '#E04F16',
  '#D97706',
  '#15803D',
  '#0284C7',
  '#7C3AED',
  '#BE123C',
  '#0F766E',
  '#B45309',
];

const ITEMS_PER_PAGE = 8;

const formatVND = (n: number) => `${Number(n).toLocaleString('vi-VN')}₫`;
const formatAP = (ap: number) => `${Number(ap).toLocaleString('vi-VN')} AP`;
const formatDateShort = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Average score snapped strictly to nearest 0.5 step (no 0.1, 0.2, etc.)
const calcAverageScore = (s: FoodScores) =>
  formatHalfStepScore((s.ngon + s.bo + s.gia + s.no + s.khoangcach) / 5);

const snapToHalf = (n: number) => Math.round(n * 2) / 2;

export default function App() {
  // Theme state with softer dark mode persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('fr_theme');
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('fr_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('fr_theme', 'light');
    }
  }, [darkMode]);

  // Separate Tab Navigation State
  const [activeTab, setActiveTab] = useState<TabId>('foods');

  // Data states
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loadingFoods, setLoadingFoods] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [foodPage, setFoodPage] = useState<number>(1);

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(true);

  // Leaderboard states (Tuần này / Tháng này / Tất cả)
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);
  const [lbPeriod, setLbPeriod] = useState<'week' | 'month' | 'all'>('week');

  // Food Feedback states + Searchable Combobox Dropdown
  const [feedbacks, setFeedbacks] = useState<FoodFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState<boolean>(true);
  const [feedbackFilterFoodId, setFeedbackFilterFoodId] = useState<number | 'all'>('all');
  const [fbFoodId, setFbFoodId] = useState<number>(1);
  const [fbDropdownOpen, setFbDropdownOpen] = useState<boolean>(false);
  const [fbFoodSearchText, setFbFoodSearchText] = useState<string>('');
  const fbDropdownRef = useRef<HTMLDivElement | null>(null);

  const [fbScores, setFbScores] = useState<FoodScores>({
    ngon: 9,
    bo: 8.5,
    gia: 8.5,
    no: 9,
    khoangcach: 9,
  });
  const [fbComment, setFbComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modals
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [loginInput, setLoginInput] = useState<string>('');
  const pendingActionRef = useRef<((userName?: string) => void) | null>(null);

  const [detailFood, setDetailFood] = useState<FoodItem | null>(null);

  // Create Team Modal (with editable Team Name & Captain Name)
  const [teamModalFood, setTeamModalFood] = useState<FoodItem | null>(null);
  const [teamCustomName, setTeamCustomName] = useState<string>('');
  const [teamCaptainInput, setTeamCaptainInput] = useState<string>('');
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [creatingTeam, setCreatingTeam] = useState<boolean>(false);

  // Spin the Wheel states
  const [wheelFoods, setWheelFoods] = useState<FoodItem[]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinResult, setSpinResult] = useState<FoodItem | null>(null);
  const [addWheelModalOpen, setAddWheelModalOpen] = useState<boolean>(false);
  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelAngleRef = useRef<number>(0);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Contact Form states (with Server-side validation)
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactSubject, setContactSubject] = useState<string>('gop-y-mon');
  const [contactDish, setContactDish] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [contactSubmitting, setContactSubmitting] = useState<boolean>(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactGeneralError, setContactGeneralError] = useState<string>('');
  const [contactSuccess, setContactSuccess] = useState<string>('');
  const [recentContacts, setRecentContacts] = useState<ContactSubmission[]>([]);

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3400);
  };

  const switchTab = (tabId: TabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close Feedback food combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fbDropdownRef.current && !fbDropdownRef.current.contains(e.target as Node)) {
        setFbDropdownOpen(false);
        const selected = foods.find((f) => f.id === fbFoodId);
        if (selected) {
          setFbFoodSearchText(selected.name);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fbFoodId, foods]);

  // Sync fbFoodSearchText when fbFoodId or foods change
  useEffect(() => {
    const selected = foods.find((f) => f.id === fbFoodId);
    if (selected && !fbDropdownOpen) {
      setFbFoodSearchText(selected.name);
    }
  }, [fbFoodId, foods, fbDropdownOpen]);

  // Reset pagination to page 1 when category or search changes
  useEffect(() => {
    setFoodPage(1);
  }, [activeCategory, searchQuery]);

  // Fetch initial data
  const fetchFoods = async () => {
    setLoadingFoods(true);
    try {
      const res = await fetch('/api/foods');
      const data: FoodItem[] = await res.json();
      setFoods(data);
      if (data.length > 0) {
        setFbFoodId((prev) => prev || data[0].id);
        setWheelFoods((prev) => (prev.length === 0 ? data.slice(0, 6) : prev));
      }
    } catch {
      showToast('Không thể tải danh sách món ăn.', 'error');
    } finally {
      setLoadingFoods(false);
    }
  };

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch('/api/teams?status=open');
      const data: TeamItem[] = await res.json();
      setTeams(data);
    } catch {
      showToast('Không thể tải danh sách team.', 'error');
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchLeaderboard = async (period = lbPeriod) => {
    setLoadingLeaderboard(true);
    try {
      const params = new URLSearchParams({ period });
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else {
        setLeaderboard(data.leaderboard || []);
      }
    } catch {
      showToast('Không thể tải bảng xếp hạng.', 'error');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch('/api/feedbacks');
      if (res.ok) {
        const data: FoodFeedback[] = await res.json();
        setFeedbacks(data);
      }
    } catch {
      showToast('Không thể tải danh sách feedback.', 'error');
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchRecentContacts = async () => {
    try {
      const res = await fetch('/api/contact');
      if (res.ok) {
        const data: ContactSubmission[] = await res.json();
        setRecentContacts(data);
      }
    } catch {
      // ignore
    }
  };

  const restoreSession = async () => {
    const saved = localStorage.getItem('fr_user');
    if (!saved) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saved }),
      });
      if (res.ok) {
        const user: UserProfile = await res.json();
        setCurrentUser(user);
        setContactName((prev) => prev || user.name);
      }
    } catch {
      localStorage.removeItem('fr_user');
    }
  };

  useEffect(() => {
    restoreSession();
    fetchFoods();
    fetchTeams();
    fetchLeaderboard('week');
    fetchFeedbacks();
    fetchRecentContacts();
  }, []);

  useEffect(() => {
    fetchLeaderboard(lbPeriod);
  }, [lbPeriod]);

  // Require login wrapper
  const requireLogin = (action: (userName?: string) => void) => {
    if (currentUser) {
      action(currentUser.name);
      return;
    }
    pendingActionRef.current = (loggedInName?: string) => {
      const saved = loggedInName || localStorage.getItem('fr_user') || '';
      action(saved);
    };
    setLoginInput('');
    setLoginOpen(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = loginInput.trim().toUpperCase();
    if (cleaned.length < 2) {
      showToast('Vui lòng nhập tên ít nhất 2 ký tự.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleaned }),
      });
      const data: UserProfile & { error?: string } = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Đăng nhập thất bại.', 'error');
        return;
      }
      setCurrentUser(data);
      localStorage.setItem('fr_user', data.name);
      setContactName((prev) => prev || data.name);
      setLoginOpen(false);
      showToast(
        `Xin chào, ${data.name}! Điểm Hoạt Động hiện tại: ${formatAP(data.elo)}`,
        'success'
      );
      fetchLeaderboard(lbPeriod);
      if (pendingActionRef.current) {
        const act = pendingActionRef.current;
        pendingActionRef.current = null;
        act(data.name);
      }
    } catch {
      showToast('Đăng nhập thất bại.', 'error');
    }
  };

  // Filtered foods + Pagination (8 items per page)
  const filteredFoods = foods.filter((f) => {
    const matchCategory = activeCategory === 'all' || f.category === activeCategory;
    const q = searchQuery.normalize('NFC').toLowerCase().trim();
    const matchSearch =
      !q ||
      f.name.normalize('NFC').toLowerCase().includes(q) ||
      f.description.normalize('NFC').toLowerCase().includes(q) ||
      String(f.price).includes(q) ||
      String(f.distance).includes(q);
    return matchCategory && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / ITEMS_PER_PAGE));
  const safePage = Math.min(foodPage, totalPages);
  const paginatedFoods = filteredFoods.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Filtered foods for Feedback Searchable Combobox
  const suggestedFeedbackFoods = foods.filter((f) => {
    const q = fbFoodSearchText.normalize('NFC').toLowerCase().trim();
    if (!q) return true;
    return (
      f.name.normalize('NFC').toLowerCase().includes(q) ||
      String(f.price).includes(q)
    );
  });

  // Filtered feedbacks
  const filteredFeedbacks =
    feedbackFilterFoodId === 'all'
      ? feedbacks
      : feedbacks.filter((fb) => fb.foodId === feedbackFilterFoodId);

  // Check if currentUser is already in any open team
  const currentUserActiveTeam = currentUser
    ? teams.find(
        (t) =>
          t.status === 'open' &&
          (t.captainName === currentUser.name || t.members.includes(currentUser.name))
      ) || null
    : null;

  // Open Team Modal helper
  const openCreateTeamModal = (food: FoodItem) => {
    requireLogin((loggedInName) => {
      const activeUser = loggedInName || currentUser?.name || '';
      const existingTeam = teams.find(
        (t) =>
          t.status === 'open' &&
          (t.captainName === activeUser || t.members.includes(activeUser))
      );
      if (existingTeam) {
        showToast(
          `Bạn đang tham gia "${existingTeam.teamName}". Không thể ở 2 team cùng lúc!`,
          'error'
        );
        switchTab('teams');
        return;
      }
      setTeamModalFood(food);
      setTeamCustomName(`Hội đi ăn ${food.name}`);
      setTeamCaptainInput(activeUser);
      setQrPreview(null);
    });
  };

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrPreview(String(ev.target?.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTeam = async () => {
    if (!teamModalFood) return;
    const finalCaptain = teamCaptainInput.trim().toUpperCase();
    const finalTeamTitle = teamCustomName.trim() || `Team ${teamModalFood.name}`;

    if (finalCaptain.length < 2) {
      showToast('Tên Captain phải có ít nhất 2 ký tự.', 'error');
      return;
    }

    setCreatingTeam(true);
    try {
      if (!currentUser || currentUser.name !== finalCaptain) {
        const userRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: finalCaptain }),
        });
        if (userRes.ok) {
          const uData = await userRes.json();
          setCurrentUser(uData);
          localStorage.setItem('fr_user', uData.name);
        }
      }

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: finalTeamTitle,
          foodId: teamModalFood.id,
          foodName: teamModalFood.name,
          captainName: finalCaptain,
          qrDataUrl: qrPreview,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Không thể tạo team.', 'error');
        return;
      }
      setTeamModalFood(null);
      setQrPreview(null);
      showToast('Tạo team thành công! Bạn nhận được +30 AP (Captain)', 'success');
      fetchTeams();
      fetchLeaderboard(lbPeriod);
      restoreSession();
      switchTab('teams');
    } catch {
      showToast('Không thể tạo team.', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = (teamId: number) => {
    requireLogin(async (loggedInName) => {
      const savedName = loggedInName || currentUser?.name || localStorage.getItem('fr_user');
      if (!savedName) return;
      try {
        const res = await fetch(`/api/teams/${teamId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: savedName }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Không thể gia nhập team.', 'error');
          return;
        }
        showToast('Đã gia nhập team! Bạn nhận được +15 AP', 'success');
        fetchTeams();
        fetchLeaderboard(lbPeriod);
        restoreSession();
      } catch {
        showToast('Không thể gia nhập team.', 'error');
      }
    });
  };

  const handleLeaveTeam = async (teamId: number) => {
    const savedName = currentUser?.name || localStorage.getItem('fr_user');
    if (!savedName) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: savedName }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Không thể thoát team.', 'error');
        return;
      }
      showToast('Bạn đã thoát khỏi team.', 'info');
      fetchTeams();
    } catch {
      showToast('Không thể thoát team.', 'error');
    }
  };

  const handleCloseTeam = async (teamId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/close`, { method: 'PUT' });
      if (!res.ok) {
        showToast('Không thể đóng team.', 'error');
        return;
      }
      showToast('Team đã đóng.', 'info');
      fetchTeams();
    } catch {
      showToast('Không thể đóng team.', 'error');
    }
  };

  // Submit Dish Feedback handler (+20 AP) — scores strictly snapped to 0.5
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requireLogin(async (loggedInName) => {
      const activeName = loggedInName || currentUser?.name || localStorage.getItem('fr_user');
      if (!activeName) return;

      if (fbComment.trim().length < 10) {
        showToast('Vui lòng nhập nhận xét tối thiểu 10 ký tự.', 'error');
        return;
      }

      const snappedScores: FoodScores = {
        ngon: snapToHalf(fbScores.ngon),
        bo: snapToHalf(fbScores.bo),
        gia: snapToHalf(fbScores.gia),
        no: snapToHalf(fbScores.no),
        khoangcach: snapToHalf(fbScores.khoangcach),
      };

      setSubmittingFeedback(true);
      try {
        const res = await fetch('/api/feedbacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: activeName,
            foodId: fbFoodId,
            scores: snappedScores,
            comment: fbComment.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Không thể gửi feedback.', 'error');
          return;
        }
        setFbComment('');
        showToast('Đã gửi Feedback món ăn! Bạn nhận được +20 AP', 'success');
        if (data.userProfile) {
          setCurrentUser(data.userProfile);
        }
        fetchFeedbacks();
        fetchFoods();
        fetchLeaderboard(lbPeriod);
      } catch {
        showToast('Không thể gửi feedback.', 'error');
      } finally {
        setSubmittingFeedback(false);
      }
    });
  };

  // Draw Spin Wheel
  const drawWheel = () => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2 - 12;

    ctx.clearRect(0, 0, W, H);

    if (wheelFoods.length === 0) {
      ctx.fillStyle = darkMode ? '#262B36' : '#F2EFE9';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = darkMode ? '#94A3B8' : '#71717A';
      ctx.font = '600 15px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Thêm ít nhất 2 món để quay', cx, cy);
      return;
    }

    const sliceAngle = (Math.PI * 2) / wheelFoods.length;
    wheelFoods.forEach((food, i) => {
      const startAngle = wheelAngleRef.current + sliceAngle * i;
      const endAngle = startAngle + sliceAngle;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = darkMode ? '#1E222B' : '#FAF8F5';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      const fontSize = Math.min(14, Math.max(11, Math.floor(110 / wheelFoods.length) + 4));
      ctx.font = `600 ${fontSize}px "Be Vietnam Pro", sans-serif`;
      const label = food.name.length > 18 ? `${food.name.slice(0, 16)}…` : food.name;
      ctx.fillText(label, r - 18, 4);
      ctx.restore();
    });

    // Center hub with "Quay"
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = darkMode ? '#262B36' : '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E04F16';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#E04F16';
    ctx.font = '700 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Quay', cx, cy);
  };

  useEffect(() => {
    if (activeTab === 'wheel') {
      drawWheel();
    }
  }, [wheelFoods, darkMode, activeTab]);

  const launchConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pieces = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 8 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      color: WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2.5 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      alpha: 1,
    }));

    const start = performance.now();
    const duration = 2400;

    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        p.alpha = Math.max(0, 1 - elapsed / duration);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < duration) {
        requestAnimationFrame(draw);
      } else {
        canvas.style.display = 'none';
      }
    };
    requestAnimationFrame(draw);
  };

  const handleSpinWheel = () => {
    if (isSpinning) return;
    if (wheelFoods.length < 2) {
      showToast('Vui lòng chọn ít nhất 2 món trong phần "+ Tùy chỉnh món" để quay!', 'info');
      setAddWheelModalOpen(true);
      return;
    }
    setIsSpinning(true);

    const totalRotations = 5 + Math.random() * 4;
    const extraAngle = Math.random() * Math.PI * 2;
    const targetDelta = totalRotations * Math.PI * 2 + extraAngle;
    const duration = 3400;
    const startTime = performance.now();
    const startAngle = wheelAngleRef.current;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      wheelAngleRef.current = startAngle + targetDelta * easeOut(t);
      drawWheel();
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        wheelAngleRef.current = startAngle + targetDelta;
        setIsSpinning(false);
        const sliceAngle = (Math.PI * 2) / wheelFoods.length;
        const normalised =
          (((-wheelAngleRef.current - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) %
          (Math.PI * 2);
        const idx = Math.floor(normalised / sliceAngle) % wheelFoods.length;
        setSpinResult(wheelFoods[idx]);
        launchConfetti();
      }
    };
    requestAnimationFrame(animate);
  };

  // Contact Form submit handler (Server-Side Validation)
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactErrors({});
    setContactGeneralError('');
    setContactSuccess('');
    setContactSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          dishOrPlace: contactDish,
          message: contactMessage,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setContactErrors(data.fieldErrors);
        }
        setContactGeneralError(data.error || 'Vui lòng kiểm tra lại thông tin.');
        showToast('Thông tin biểu mẫu chưa hợp lệ.', 'error');
        return;
      }

      setContactSuccess(data.message);
      setContactDish('');
      setContactMessage('');
      showToast('Đã gửi góp ý thành công!', 'success');
      fetchRecentContacts();
    } catch {
      setContactGeneralError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      showToast('Không thể gửi biểu mẫu.', 'error');
    } finally {
      setContactSubmitting(false);
    }
  };

  const subjectLabelMap: Record<string, string> = {
    'gop-y-mon': 'Đánh giá món ăn',
    'de-xuat-quan': 'Đề xuất quán mới',
    'hop-tac': 'Hợp tác quán ăn',
    'bao-loi': 'Báo lỗi hệ thống',
  };

  const navTabs: { id: TabId; label: string }[] = [
    { id: 'foods', label: 'Món Ăn' },
    { id: 'teams', label: 'Lập Team' },
    { id: 'leaderboard', label: 'Xếp Hạng' },
    { id: 'feedback', label: 'Feedback Món' },
    { id: 'wheel', label: 'Vòng Quay' },
    { id: 'contact', label: 'Liên Hệ' },
    { id: 'admin', label: '⚙ Admin' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#18181B] dark:bg-[#1E222B] dark:text-[#F1F5F9] transition-colors duration-200">
      {/* ── TOP NAVIGATION BAR (3-Zone Contract with Tab Switching) ── */}
      <header className="sticky top-0 z-30 h-16 bg-[#FAF8F5]/95 dark:bg-[#1E222B]/95 backdrop-blur-md border-b border-black/8 dark:border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => switchTab('foods')}
            className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Đánh Giá Món Ăn
          </button>

          {/* Zone 2: 6 clean text navigation tabs */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-slate-300"
          >
            {navTabs.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id)}
                  className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'border-[#E04F16] text-[#E04F16] dark:text-[#FF7A45] font-semibold'
                      : 'border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary actions (Dark mode toggle + User login/profile) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
              className="w-10 h-10 rounded-lg border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] dark:hover:border-[#E04F16] flex items-center justify-center transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setLoginInput(currentUser.name);
                  setLoginOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 hover:border-[#E04F16] text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{currentUser.name}</span>
                <span className="mx-1.5 text-zinc-400">·</span>
                <span className="font-mono-tabular text-[#E04F16] dark:text-[#FF7A45]">
                  {formatAP(currentUser.elo)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginInput('');
                  setLoginOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-[#E04F16] hover:bg-[#C43E0B] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="md:hidden sticky top-16 z-20 bg-[#FAF8F5]/95 dark:bg-[#1E222B]/95 backdrop-blur border-b border-black/8 dark:border-white/10 overflow-x-auto">
        <div className="px-4 flex items-center gap-5 h-11 text-xs font-medium text-zinc-600 dark:text-slate-300">
          {navTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={`whitespace-nowrap shrink-0 py-2 border-b-2 cursor-pointer ${
                activeTab === item.id
                  ? 'border-[#E04F16] text-[#E04F16] dark:text-[#FF7A45] font-semibold'
                  : 'border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN TAB VIEWS ── */}
      <main className="flex-1">
        {/* ── TAB 1: MÓN ĂN (8 ITEMS PER PAGE + PAGINATION) ── */}
        {activeTab === 'foods' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-2">
                    Cẩm nang ẩm thực & tích điểm hoạt động
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white text-balance max-w-2xl">
                    Khám phá quán ngon quanh bạn với biểu đồ Đánh giá 360
                  </h1>
                </div>

                {/* Search Input */}
                <div className="w-full lg:w-96 relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm món ăn, giá tiền hoặc khoảng cách..."
                    aria-label="Tìm kiếm món ăn"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#E04F16] transition-colors"
                  />
                </div>
              </div>

              {/* Interactive Segmented Category Filter */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-7">
                <div
                  role="tablist"
                  aria-label="Lọc theo danh mục món ăn"
                  className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EFECE6] dark:bg-[#282D3A] border border-black/5 dark:border-white/8 overflow-x-auto max-w-full"
                >
                  {[
                    { id: 'all', label: 'Tất Cả' },
                    { id: 'pho', label: 'Phở' },
                    { id: 'bun', label: 'Bún' },
                    { id: 'mien', label: 'Miến & Trộn' },
                    { id: 'com', label: 'Cơm' },
                  ].map((cat) => {
                    const active = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                          active
                            ? 'bg-white dark:bg-[#363D4E] text-[#E04F16] dark:text-[#FF7A45] shadow-xs'
                            : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-zinc-500 dark:text-slate-400 font-mono-tabular">
                  Trang {safePage}/{totalPages} · Hiển thị {paginatedFoods.length} / {filteredFoods.length} món
                </div>
              </div>

              {/* Food Grid */}
              {loadingFoods ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-72 rounded-2xl bg-[#EFECE6] dark:bg-[#282D3A] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredFoods.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10">
                  <Utensils className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600 dark:text-slate-300 mb-3">
                    Không tìm thấy món ăn nào phù hợp với từ khóa của bạn.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-[#E04F16] hover:underline cursor-pointer"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {paginatedFoods.map((food, idx) => {
                      const avg = calcAverageScore(food.scores);
                      return (
                        <article
                          key={food.id}
                          onClick={() => setDetailFood(food)}
                          className="group bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 flex flex-col"
                        >
                          <div className="relative">
                            <OptimizedImage
                              src={food.image}
                              alt={food.name}
                              priority={idx < 4}
                              aspectClass="aspect-[4/3]"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-8 flex items-end justify-between text-xs text-white">
                              <span className="font-mono-tabular">{food.distance} km</span>
                              <span className="font-mono-tabular font-semibold">
                                TB {avg} / 10
                              </span>
                            </div>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-slate-400 mb-1">
                                <span>
                                  {food.category === 'pho'
                                    ? 'Phở truyền thống'
                                    : food.category === 'bun'
                                    ? 'Bún đặc sản'
                                    : food.category === 'com'
                                    ? 'Cơm trưa'
                                    : 'Miến & Trộn'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono-tabular">
                                  {food.reviewCount || 1} đánh giá
                                </span>
                              </div>
                              <h2 className="text-base font-semibold text-zinc-900 dark:text-white group-hover:text-[#E04F16] dark:group-hover:text-[#FF7A45] transition-colors line-clamp-1">
                                {food.name}
                              </h2>
                              <p className="text-xs text-zinc-500 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                                {food.description}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-black/5 dark:border-white/8 flex items-center justify-between">
                              <span className="font-mono-tabular text-base font-bold text-[#E04F16] dark:text-[#FF7A45]">
                                {formatVND(food.price)}
                              </span>
                              <span className="text-xs font-semibold text-zinc-600 dark:text-slate-300 group-hover:text-[#E04F16] dark:group-hover:text-[#FF7A45] transition-colors">
                                Xem đánh giá →
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => {
                          setFoodPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        aria-label="Trang trước"
                        className="w-10 h-10 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-zinc-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#E04F16] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        const active = pageNum === safePage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => {
                              setFoodPage(pageNum);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-10 h-10 rounded-xl font-mono-tabular text-sm font-bold transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#E04F16] text-white shadow-xs'
                                : 'bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 text-zinc-700 dark:text-slate-200 hover:border-[#E04F16]'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() => {
                          setFoodPage((p) => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        aria-label="Trang tiếp"
                        className="w-10 h-10 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-zinc-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#E04F16] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ── TAB 2: LẬP TEAM ── */}
        {activeTab === 'teams' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-1">
                    Mỗi thành viên chỉ tham gia 1 team tại một thời điểm · Captain +30 AP · Member +15 AP
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                    Lập Team Đi Ăn ({teams.length})
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => switchTab('foods')}
                    className="px-4 py-2 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Chọn món để lập Team
                  </button>
                  <button
                    type="button"
                    onClick={fetchTeams}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-[#282D3A] text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {currentUserActiveTeam && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-emerald-800 dark:text-emerald-200">
                    Bạn đang ở trong team{' '}
                    <strong className="font-bold">{currentUserActiveTeam.teamName}</strong> (Món:{' '}
                    {currentUserActiveTeam.foodName}). Hãy thoát team hiện tại nếu muốn chuyển sang team khác.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLeaveTeam(currentUserActiveTeam.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát khỏi Team</span>
                  </button>
                </div>
              )}

              {loadingTeams ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-44 rounded-2xl bg-[#EFECE6] dark:bg-[#282D3A] animate-pulse"
                    />
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10">
                  <Users className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600 dark:text-slate-300 mb-4">
                    Chưa có team nào đang mở. Hãy chọn một món ăn và lập Team để nhận ngay +30 AP!
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab('foods')}
                    className="px-4 py-2 rounded-xl bg-[#E04F16] text-white text-xs font-semibold cursor-pointer"
                  >
                    Xem danh sách món ăn
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((team) => {
                    const isCaptain = currentUser?.name === team.captainName;
                    const isMember = currentUser ? team.members.includes(currentUser.name) : false;
                    const inAnotherTeam =
                      Boolean(currentUserActiveTeam) && currentUserActiveTeam?.id !== team.id;
                    const allParticipants = [team.captainName, ...team.members];

                    return (
                      <div
                        key={team.id}
                        className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-slate-400 mb-1">
                              <span>Captain: {team.captainName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                {allParticipants.length} thành viên
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                              {team.teamName || team.foodName}
                            </h3>
                            <p className="text-xs font-semibold text-[#E04F16] dark:text-[#FF7A45] mt-0.5 truncate">
                              Món: {team.foodName}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-slate-300 mt-2 leading-relaxed">
                              Thành viên: {allParticipants.join(', ')}
                            </p>
                          </div>

                          {team.qrUrl && (
                            <OptimizedImage
                              src={team.qrUrl}
                              alt={`QR thanh toán của ${team.captainName}`}
                              aspectClass="aspect-square"
                              className="w-16 h-16 rounded-lg border border-black/10 dark:border-white/12 shrink-0"
                            />
                          )}
                        </div>

                        <div className="pt-3 border-t border-black/5 dark:border-white/8 flex items-center gap-2">
                          {isCaptain ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleLeaveTeam(team.id)}
                                className="flex-1 py-2 px-3 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Thoát Team</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCloseTeam(team.id)}
                                className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-[#363D4E] hover:bg-zinc-200 dark:hover:bg-slate-600 text-xs font-semibold text-zinc-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                Đóng Team
                              </button>
                            </>
                          ) : isMember ? (
                            <button
                              type="button"
                              onClick={() => handleLeaveTeam(team.id)}
                              className="w-full py-2 px-4 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Thoát khỏi Team</span>
                            </button>
                          ) : inAnotherTeam ? (
                            <button
                              type="button"
                              disabled
                              title="Bạn đang ở trong một team khác"
                              className="w-full py-2 px-4 rounded-xl bg-zinc-100 dark:bg-[#363D4E]/50 text-zinc-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed"
                            >
                              Đang ở team khác
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJoinTeam(team.id)}
                              className="w-full py-2 px-4 rounded-xl border border-[#E04F16] text-[#E04F16] dark:text-[#FF7A45] hover:bg-[#E04F16] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Gia nhập Team (+15 AP)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TAB 3: XẾP HẠNG ACTIVITY POINTS + 3D PODIUM (GOLD / SILVER / BRONZE) ── */}
        {activeTab === 'leaderboard' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-1">
                    Mọi thành viên bắt đầu từ 0 AP · Tích điểm qua từng hoạt động
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                    Bảng Xếp Hạng Điểm Hoạt Động (Activity Points)
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div
                    role="tablist"
                    aria-label="Lọc bảng xếp hạng theo thời gian"
                    className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EFECE6] dark:bg-[#282D3A] border border-black/5 dark:border-white/8"
                  >
                    {[
                      { id: 'week', label: 'Tuần này (7 ngày)' },
                      { id: 'month', label: 'Tháng này (30 ngày)' },
                      { id: 'all', label: 'Tất cả' },
                    ].map((tab) => {
                      const active = lbPeriod === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setLbPeriod(tab.id as 'week' | 'month' | 'all')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            active
                              ? 'bg-white dark:bg-[#363D4E] text-[#E04F16] dark:text-[#FF7A45] shadow-xs'
                              : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#EFECE6]/70 dark:bg-[#282D3A] text-xs text-zinc-600 dark:text-slate-300">
                <span className="font-semibold text-zinc-800 dark:text-white">
                  Cơ chế tính Điểm Hoạt Động (Khởi đầu = 0 AP):
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-tabular">
                  <span>Làm Captain lập team: +30 AP</span>
                  <span>·</span>
                  <span>Feedback món ăn: +20 AP</span>
                  <span>·</span>
                  <span>Gia nhập team: +15 AP</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Leaderboard Ranking List (6 cols) */}
                <div className="lg:col-span-6">
                  {loadingLeaderboard ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-16 rounded-xl bg-[#EFECE6] dark:bg-[#282D3A] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 text-sm text-zinc-500">
                      Chưa có hoạt động nào trong khoảng thời gian này.
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 divide-y divide-black/6 dark:divide-white/8 overflow-hidden">
                      {leaderboard.map((user, idx) => {
                        const isMe = currentUser?.name === user.name;
                        return (
                          <div
                            key={user.name}
                            className={`p-4 sm:px-5 flex items-center justify-between gap-4 transition-colors ${
                              isMe ? 'bg-[#E04F16]/8 dark:bg-[#E04F16]/18' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-tabular text-xs font-bold shrink-0 ${
                                  idx === 0
                                    ? 'bg-amber-400/25 text-amber-700 dark:text-amber-300'
                                    : idx === 1
                                    ? 'bg-slate-300/50 text-slate-700 dark:text-slate-200'
                                    : idx === 2
                                    ? 'bg-orange-400/25 text-orange-800 dark:text-orange-300'
                                    : 'text-zinc-500 dark:text-slate-400'
                                }`}
                              >
                                #{idx + 1}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                                    {user.name}
                                  </span>
                                  {isMe && (
                                    <span className="text-xs font-medium text-[#E04F16] dark:text-[#FF7A45]">
                                      (Bạn)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-slate-300 mt-0.5 truncate">
                                  {user.titles.join(' · ')}
                                </div>
                                <div className="text-[11px] text-zinc-400 dark:text-slate-400 font-mono-tabular mt-0.5">
                                  Captain: {user.teamsHosted} · Gia nhập team: {user.teamsJoined} · Feedback: {user.feedbacksCount}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono-tabular text-base font-bold text-[#E04F16] dark:text-[#FF7A45]">
                                {formatAP(user.elo)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: 3D Gold / Silver / Bronze Podium with Crown & User Names (6 cols) */}
                <div className="lg:col-span-6">
                  <LeaderboardPodium
                    topUsers={leaderboard.slice(0, 3)}
                    currentUserName={currentUser?.name}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB 4: FEEDBACK MÓN ĂN (0.5 STEP SCORE SELECTION + SEARCHABLE DROPDOWN) ── */}
        {activeTab === 'feedback' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-1">
                  Đánh giá thực tế từ cộng đồng · Nhận ngay +20 AP mỗi lượt Feedback
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                  Feedback & Chấm Điểm Món Ăn
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-5">
                  <form
                    onSubmit={handleFeedbackSubmit}
                    className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-black/6 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquarePlus className="w-4 h-4 text-[#E04F16]" />
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                          Viết Feedback Món Ăn
                        </h3>
                      </div>
                      <span className="font-mono-tabular text-xs font-semibold text-[#E04F16] dark:text-[#FF7A45]">
                        +20 AP
                      </span>
                    </div>

                    {/* Searchable Autocomplete Dropdown for Dish Selection */}
                    <div ref={fbDropdownRef} className="relative">
                      <label
                        htmlFor="fb-food-combobox"
                        className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
                      >
                        Chọn món ăn bạn muốn đánh giá (nhập chữ để tìm nhanh)
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="fb-food-combobox"
                          type="text"
                          value={fbFoodSearchText}
                          onFocus={() => {
                            setFbDropdownOpen(true);
                            setFbFoodSearchText('');
                          }}
                          onChange={(e) => {
                            setFbFoodSearchText(e.target.value);
                            setFbDropdownOpen(true);
                          }}
                          placeholder="Nhập tên món ăn (VD: Phở, Bún chả, Cơm tấm...)"
                          autoComplete="off"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setFbDropdownOpen((o) => {
                              const next = !o;
                              if (next) setFbFoodSearchText('');
                              return next;
                            });
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {fbDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 z-20 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-[#1E222B] border border-black/12 dark:border-white/15 shadow-xl divide-y divide-black/5 dark:divide-white/6">
                          {suggestedFeedbackFoods.length === 0 ? (
                            <div className="p-3 text-xs text-zinc-400 text-center">
                              Không tìm thấy món ăn phù hợp với &ldquo;{fbFoodSearchText}&rdquo;
                            </div>
                          ) : (
                            suggestedFeedbackFoods.map((f) => {
                              const isSelected = f.id === fbFoodId;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    setFbFoodId(f.id);
                                    setFbFoodSearchText(f.name);
                                    setFbDropdownOpen(false);
                                  }}
                                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#E04F16]/12 text-[#E04F16] dark:text-[#FF7A45] font-semibold'
                                      : 'text-zinc-800 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-[#282D3A]'
                                  }`}
                                >
                                  <span className="truncate">{f.name}</span>
                                  <span className="font-mono-tabular text-xs text-zinc-400 shrink-0">
                                    {formatVND(f.price)}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* 5-Axis Scoring strictly in 0.5 increments (7, 7.5, 8, 8.5, 9...) */}
                    <div className="space-y-3.5 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-700 dark:text-slate-200">
                          Chấm điểm 5 chiều (Bước nhảy 0.5 điểm):
                        </p>
                        <span className="font-mono-tabular text-xs font-bold text-[#E04F16] dark:text-[#FF7A45]">
                          TB: {calcAverageScore(fbScores)} / 10
                        </span>
                      </div>

                      {(
                        [
                          { key: 'ngon', label: 'Độ Ngon (Hương vị)' },
                          { key: 'bo', label: 'Độ Bổ (Dinh dưỡng)' },
                          { key: 'gia', label: 'Giá Hợp Lý (Rẻ)' },
                          { key: 'no', label: 'Khẩu Phần (Độ No)' },
                          { key: 'khoangcach', label: 'Thuận Tiện (Gần)' },
                        ] as { key: keyof FoodScores; label: string }[]
                      ).map((axis) => {
                        const val = fbScores[axis.key];
                        return (
                          <div
                            key={axis.key}
                            className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/5 dark:border-white/8 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-zinc-700 dark:text-slate-200">
                                {axis.label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFbScores((prev) => ({
                                      ...prev,
                                      [axis.key]: Math.max(1, snapToHalf(prev[axis.key] - 0.5)),
                                    }))
                                  }
                                  className="w-6 h-6 rounded-md bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 font-mono-tabular text-xs font-bold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] cursor-pointer"
                                  title="Giảm 0.5 điểm"
                                >
                                  -
                                </button>
                                <span className="w-14 text-center font-mono-tabular font-bold text-sm text-[#E04F16] dark:text-[#FF7A45]">
                                  {formatHalfStepScore(val)} / 10
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFbScores((prev) => ({
                                      ...prev,
                                      [axis.key]: Math.min(10, snapToHalf(prev[axis.key] + 0.5)),
                                    }))
                                  }
                                  className="w-6 h-6 rounded-md bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 font-mono-tabular text-xs font-bold text-zinc-700 dark:text-slate-200 hover:border-[#E04F16] cursor-pointer"
                                  title="Tăng 0.5 điểm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              step={0.5}
                              value={val}
                              onChange={(e) =>
                                setFbScores((prev) => ({
                                  ...prev,
                                  [axis.key]: snapToHalf(Number(e.target.value)),
                                }))
                              }
                              className="w-full accent-[#E04F16] cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="fb-comment"
                          className="block text-xs font-semibold text-zinc-700 dark:text-slate-200"
                        >
                          Nhận xét thực tế * (tối thiểu 10 ký tự)
                        </label>
                        <span className="font-mono-tabular text-xs text-zinc-400">
                          {fbComment.length}/500
                        </span>
                      </div>
                      <textarea
                        id="fb-comment"
                        rows={3}
                        maxLength={500}
                        value={fbComment}
                        onChange={(e) => setFbComment(e.target.value)}
                        placeholder="Nước dùng thế nào, thịt có mềm không, phục vụ nhanh không?..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full py-3 px-5 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {submittingFeedback
                        ? 'Đang gửi đánh giá...'
                        : 'Gửi Feedback & Nhận +20 AP'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      Đánh giá từ các thành viên ({filteredFeedbacks.length})
                    </h3>

                    <select
                      aria-label="Lọc feedback theo món ăn"
                      value={feedbackFilterFoodId}
                      onChange={(e) =>
                        setFeedbackFilterFoodId(
                          e.target.value === 'all' ? 'all' : Number(e.target.value)
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#282D3A] border border-black/10 dark:border-white/12 text-xs font-medium text-zinc-700 dark:text-slate-200 focus:outline-none focus:border-[#E04F16]"
                    >
                      <option value="all">Tất cả món ăn ({feedbacks.length})</option>
                      {foods.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {loadingFeedbacks ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-28 rounded-2xl bg-[#EFECE6] dark:bg-[#282D3A] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : filteredFeedbacks.length === 0 ? (
                    <div className="p-10 text-center bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 text-sm text-zinc-500">
                      Chưa có nhận xét nào cho món ăn này. Hãy là người đầu tiên gửi feedback!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredFeedbacks.map((fb) => {
                        const avg = calcAverageScore(fb.scores);
                        return (
                          <article
                            key={fb.id}
                            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-5 space-y-3"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <div>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                                  {fb.userName}
                                </span>
                                <span className="mx-2 text-zinc-400">·</span>
                                <span className="text-xs font-semibold text-[#E04F16] dark:text-[#FF7A45]">
                                  {fb.foodName}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-mono-tabular text-zinc-500 dark:text-slate-400">
                                <span className="font-bold text-zinc-900 dark:text-white">
                                  TB {avg} / 10
                                </span>
                                <span>·</span>
                                <span>{formatDateShort(fb.createdAt)}</span>
                              </div>
                            </div>

                            <p className="text-sm text-zinc-700 dark:text-slate-200 leading-relaxed">
                              {fb.comment}
                            </p>

                            <div className="pt-2 border-t border-black/5 dark:border-white/8 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-tabular text-zinc-500 dark:text-slate-400">
                              <span>Ngon {formatHalfStepScore(fb.scores.ngon)}</span>
                              <span>·</span>
                              <span>Bổ {formatHalfStepScore(fb.scores.bo)}</span>
                              <span>·</span>
                              <span>Rẻ {formatHalfStepScore(fb.scores.gia)}</span>
                              <span>·</span>
                              <span>No {formatHalfStepScore(fb.scores.no)}</span>
                              <span>·</span>
                              <span>Gần {formatHalfStepScore(fb.scores.khoangcach)}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB 5: VÒNG QUAY CHỌN MÓN ── */}
        {activeTab === 'wheel' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-6 sm:p-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-1">
                  Trưa nay ăn gì?
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                  Vòng Quay Chọn Món
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-slate-300 mb-6">
                  Bấm trực tiếp vào vòng quay bên dưới để xoay chọn món ngẫu nhiên!
                </p>

                {/* Interactive Wheel Canvas: Click directly to spin */}
                <div
                  onClick={handleSpinWheel}
                  role="button"
                  tabIndex={0}
                  aria-label="Bấm vào vòng quay để quay chọn món"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSpinWheel();
                    }
                  }}
                  title="Bấm trực tiếp vào vòng quay để xoay!"
                  className={`relative w-full max-w-[340px] mx-auto mb-7 select-none transition-transform ${
                    isSpinning
                      ? 'cursor-wait'
                      : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[22px] border-t-[#E04F16]"
                  />
                  <canvas
                    ref={wheelCanvasRef}
                    width={360}
                    height={360}
                    className="w-full h-auto rounded-full shadow-md"
                  />
                </div>

                {/* Orange Button: "+ Tùy chỉnh món" */}
                <button
                  type="button"
                  onClick={() => setAddWheelModalOpen(true)}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tùy chỉnh món ({wheelFoods.length} món)</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB 6: LIÊN HỆ & ĐỀ XUẤT QUÁN NGON ── */}
        {activeTab === 'contact' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45] mb-2">
                      Đóng góp & Liên hệ
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white text-balance">
                      Đề xuất quán ngon hoặc gửi góp ý cho cộng đồng
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-slate-300 mt-3 leading-relaxed">
                      Bạn biết một quán phở gia truyền hay tiệm cơm tấm mới mở gần khu vực văn phòng? Hãy gửi thông tin qua biểu mẫu bên cạnh. Mọi dữ liệu đều được kiểm tra hợp lệ từ máy chủ trước khi lưu trữ.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Tiêu chí đánh giá 360 (Thang điểm chẵn & 0.5)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-slate-300 leading-relaxed">
                      Mọi điểm số món ăn được chuẩn hóa theo bước nhảy 0.5 (7, 7.5, 8, 8.5, 9...) giúp biểu đồ Đánh giá 360 giữa Admin (Vàng Chanh) và Cộng đồng (Cam) trực quan, rõ ràng.
                    </p>
                  </div>

                  {recentContacts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                        Đóng góp vừa ghi nhận ({recentContacts.length})
                      </h3>
                      <div className="space-y-2.5">
                        {recentContacts.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl bg-white dark:bg-[#282D3A] border border-black/6 dark:border-white/10 text-xs"
                          >
                            <div className="flex items-center justify-between text-zinc-500 dark:text-slate-400 mb-1">
                              <span className="font-semibold text-zinc-800 dark:text-white">
                                {item.name}
                              </span>
                              <span>{subjectLabelMap[item.subject] || item.subject}</span>
                            </div>
                            {item.dishOrPlace && (
                              <p className="font-medium text-[#E04F16] dark:text-[#FF7A45] mb-1">
                                Quán/Món: {item.dishOrPlace}
                              </p>
                            )}
                            <p className="text-zinc-600 dark:text-slate-300 line-clamp-2">
                              {item.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7">
                  <form
                    onSubmit={handleContactSubmit}
                    noValidate
                    className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-6 sm:p-8 space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-black/6 dark:border-white/10 pb-4">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        Biểu mẫu Đề xuất & Liên hệ
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-slate-400">
                        * Bắt buộc
                      </span>
                    </div>

                    {contactGeneralError && (
                      <div
                        role="alert"
                        className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{contactGeneralError}</span>
                      </div>
                    )}

                    {contactSuccess && (
                      <div
                        role="status"
                        className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{contactSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
                        >
                          Họ và tên *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          aria-invalid={Boolean(contactErrors.name)}
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors ${
                            contactErrors.name
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-black/10 dark:border-white/12 focus:border-[#E04F16]'
                          }`}
                        />
                        {contactErrors.name && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {contactErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
                        >
                          Địa chỉ Email *
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="ban@congty.vn"
                          aria-invalid={Boolean(contactErrors.email)}
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors ${
                            contactErrors.email
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-black/10 dark:border-white/12 focus:border-[#E04F16]'
                          }`}
                        />
                        {contactErrors.email && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {contactErrors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
                        >
                          Chủ đề *
                        </label>
                        <select
                          id="contact-subject"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                        >
                          <option value="gop-y-mon">Đánh giá món ăn</option>
                          <option value="de-xuat-quan">Đề xuất quán mới</option>
                          <option value="hop-tac">Hợp tác quán ăn</option>
                          <option value="bao-loi">Báo lỗi hệ thống</option>
                        </select>
                        {contactErrors.subject && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {contactErrors.subject}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="contact-dish"
                          className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
                        >
                          Tên món hoặc địa chỉ quán (tuỳ chọn)
                        </label>
                        <input
                          id="contact-dish"
                          type="text"
                          value={contactDish}
                          onChange={(e) => setContactDish(e.target.value)}
                          placeholder="VD: Bún Đậu Ngõ Trạm - 45k"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/10 dark:border-white/12 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
                        />
                        {contactErrors.dishOrPlace && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {contactErrors.dishOrPlace}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="contact-message"
                          className="block text-xs font-semibold text-zinc-700 dark:text-slate-200"
                        >
                          Nội dung chi tiết * (tối thiểu 15 ký tự)
                        </label>
                        <span className="font-mono-tabular text-xs text-zinc-400">
                          {contactMessage.length}/1000
                        </span>
                      </div>
                      <textarea
                        id="contact-message"
                        rows={4}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Chia sẻ trải nghiệm của bạn về hương vị, giá cả, khoảng cách hoặc đề xuất cải thiện..."
                        aria-invalid={Boolean(contactErrors.message)}
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors ${
                          contactErrors.message
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-black/10 dark:border-white/12 focus:border-[#E04F16]'
                        }`}
                      />
                      {contactErrors.message && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {contactErrors.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{contactSubmitting ? 'Đang xác thực & gửi...' : 'Gửi đóng góp'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB 7: ADMIN ── */}
        {activeTab === 'admin' && (
          <section className="py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdminPanel />
            </div>
          </section>
        )}
      </main>
      <footer className="border-t border-black/6 dark:border-white/10 py-6 bg-white/50 dark:bg-[#191D25]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Đánh Giá Món Ăn. Cẩm nang ẩm thực & kết nối bữa trưa.</p>
          <div className="flex items-center gap-5">
            {navTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* Confetti Canvas */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50 hidden"
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-lg transition-all ${
            toast.type === 'error'
              ? 'bg-red-600'
              : toast.type === 'info'
              ? 'bg-sky-600'
              : 'bg-emerald-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── MODAL: LOGIN ── */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLoginOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/10 dark:border-white/12 max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Đặt tên thành viên
              </h2>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-300 mb-4 leading-relaxed">
              Mọi người mới đều bắt đầu với <strong className="text-zinc-800 dark:text-white">0 AP (Điểm Hoạt Động)</strong>. Hãy lập team, gia nhập team hoặc gửi feedback món ăn để thăng hạng!
            </p>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value.toUpperCase())}
                placeholder="VD: MINH ANH"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/15 dark:border-white/15 text-sm font-semibold uppercase text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Lưu & Tiếp tục
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: FOOD DETAIL + DUAL CIRCULAR 360 CHARTS (LIME FOR ADMIN, ORANGE FOR COMMUNITY) ── */}
      {detailFood && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDetailFood(null)}
        >
          <div
            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/10 dark:border-white/12 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <OptimizedImage
                src={detailFood.image}
                alt={detailFood.name}
                priority
                aspectClass="aspect-[21/9]"
              />
              <button
                type="button"
                onClick={() => setDetailFood(null)}
                aria-label="Đóng"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                <span className="px-3 py-1 rounded-lg bg-black/65 backdrop-blur-xs font-mono-tabular text-xs font-semibold">
                  Trung bình Cộng đồng: {calcAverageScore(detailFood.scores)} / 10 ({detailFood.reviewCount || 1} đánh giá)
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {detailFood.name}
                </h2>
                <div className="flex items-center gap-3 font-mono-tabular text-sm">
                  <span className="font-bold text-[#E04F16] dark:text-[#FF7A45] text-lg">
                    {formatVND(detailFood.price)}
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-600 dark:text-slate-300">
                    Cách {detailFood.distance} km
                  </span>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-slate-300 leading-relaxed">
                {detailFood.description}
              </p>

              {/* 2 Circular 360 Charts: Admin (Lime) vs Community (Orange) */}
              <div className="pt-4 border-t border-black/6 dark:border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <DonutScoreChart
                    title="Đánh giá 360 — Admin"
                    subtitle="Điểm thẩm định gốc từ Admin"
                    scores={detailFood.adminScores || detailFood.scores}
                    accentColor="lime"
                  />
                  <DonutScoreChart
                    title="Đánh giá 360 — Cộng đồng"
                    subtitle={`Trung bình cộng từ ${detailFood.reviewCount || 1} lượt Feedback`}
                    scores={detailFood.scores}
                    accentColor="orange"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = detailFood;
                    setDetailFood(null);
                    setFbFoodId(chosen.id);
                    setFbFoodSearchText(chosen.name);
                    setFeedbackFilterFoodId(chosen.id);
                    switchTab('feedback');
                  }}
                  className="flex-1 py-3 px-5 rounded-xl border border-black/15 dark:border-white/15 hover:border-[#E04F16] text-zinc-800 dark:text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Viết Feedback (+20 AP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const chosen = detailFood;
                    setDetailFood(null);
                    openCreateTeamModal(chosen);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Lập Team đi ăn (+30 AP)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE TEAM ── */}
      {teamModalFood && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setTeamModalFood(null)}
        >
          <div
            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/10 dark:border-white/12 max-w-md w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Lập Team đi ăn (+30 AP)
              </h2>
              <button
                type="button"
                onClick={() => setTeamModalFood(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-500 dark:text-slate-300">
              Món đã chọn:
              <p className="text-sm font-bold text-[#E04F16] dark:text-[#FF7A45] mt-0.5">
                {teamModalFood.name}
              </p>
            </div>

            <div>
              <label
                htmlFor="team-custom-name"
                className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
              >
                Tên Team đi ăn (có thể chỉnh sửa)
              </label>
              <input
                id="team-custom-name"
                type="text"
                value={teamCustomName}
                onChange={(e) => setTeamCustomName(e.target.value)}
                placeholder="VD: Hội Săn Phở Trưa Nay"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/15 dark:border-white/15 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
              />
            </div>

            <div>
              <label
                htmlFor="team-captain-name"
                className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5"
              >
                Tên Captain của bạn (có thể chỉnh sửa)
              </label>
              <input
                id="team-captain-name"
                type="text"
                value={teamCaptainInput}
                onChange={(e) => setTeamCaptainInput(e.target.value.toUpperCase())}
                placeholder="VD: MINH ANH"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1E222B] border border-black/15 dark:border-white/15 text-sm font-semibold uppercase text-zinc-900 dark:text-white focus:outline-none focus:border-[#E04F16]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-2">
                Ảnh mã QR nhận chuyển khoản của bạn (tuỳ chọn)
              </label>
              <label className="relative w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-zinc-300 dark:border-slate-600 hover:border-[#E04F16] flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-[#FAF8F5] dark:bg-[#1E222B] transition-colors">
                {qrPreview ? (
                  <>
                    <img
                      src={qrPreview}
                      alt="QR Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setQrPreview(null);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-3 text-zinc-400">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[11px] leading-tight">Tải lên ảnh QR</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTeamModalFood(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/12 text-xs font-semibold text-zinc-600 dark:text-slate-300 cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={creatingTeam}
                onClick={handleCreateTeam}
                className="flex-1 py-2.5 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {creatingTeam ? 'Đang tạo...' : 'Tạo Team (+30 AP)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SPIN RESULT ── */}
      {spinResult && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSpinResult(null)}
        >
          <div
            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/10 dark:border-white/12 max-w-sm w-full p-6 text-center shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Trophy className="w-10 h-10 text-[#E04F16] mx-auto" />
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Vòng quay đã chọn
            </p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {spinResult.name}
            </h3>
            <p className="font-mono-tabular text-sm font-semibold text-[#E04F16] dark:text-[#FF7A45]">
              {formatVND(spinResult.price)} · Cách {spinResult.distance} km
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSpinResult(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/12 text-xs font-semibold text-zinc-600 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = spinResult;
                  setSpinResult(null);
                  setDetailFood(chosen);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#E04F16] hover:bg-[#C43E0B] text-white text-xs font-semibold cursor-pointer"
              >
                Xem chi tiết món
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOMIZE WHEEL DISHES ── */}
      {addWheelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAddWheelModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/10 dark:border-white/12 max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Tùy chỉnh món trong vòng quay
              </h2>
              <button
                type="button"
                onClick={() => setAddWheelModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-black/6 dark:divide-white/8 max-h-80 overflow-y-auto">
              {foods.map((f) => {
                const added = wheelFoods.some((w) => w.id === f.id);
                return (
                  <div key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-800 dark:text-slate-100 truncate">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (added) {
                          setWheelFoods((prev) => prev.filter((item) => item.id !== f.id));
                        } else {
                          setWheelFoods((prev) => [...prev, f]);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        added
                          ? 'bg-rose-500/12 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white'
                          : 'bg-[#E04F16] hover:bg-[#C43E0B] text-white'
                      }`}
                    >
                      {added ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>Bỏ</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setAddWheelModalOpen(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
            >
              Hoàn tất ({wheelFoods.length} món)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

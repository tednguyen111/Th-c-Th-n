import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FoodScores {
  ngon: number;
  bo: number;
  gia: number;
  no: number;
  khoangcach: number;
}

export interface FoodItem {
  id: number;
  name: string;
  category: 'pho' | 'bun' | 'com' | 'mien';
  description: string;
  price: number;
  distance: number;
  image: string;
  adminScores: FoodScores;
  scores: FoodScores; // Average of user feedbacks (rounded to nearest 0.5)
  reviewCount: number;
}

export interface TeamItem {
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

export type ActivityType = 'eat' | 'captain' | 'join_team' | 'feedback';

export interface ActivityLog {
  id: number;
  userName: string;
  type: ActivityType;
  points: number;
  description: string;
  foodId?: number;
  foodName?: string;
  amountSpent?: number;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  elo: number; // Activity Points (AP), starts at 0
  mealsCount: number;
  teamsHosted: number;
  teamsJoined: number;
  feedbacksCount: number;
  totalSpent: number;
  titles: string[];
}

export interface FoodFeedback {
  id: number;
  foodId: number;
  foodName: string;
  userName: string;
  scores: FoodScores;
  comment: string;
  createdAt: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: 'gop-y-mon' | 'de-xuat-quan' | 'hop-tac' | 'bao-loi';
  dishOrPlace?: string;
  message: string;
  createdAt: string;
}

export const POINT_RULES = {
  EAT: 15,
  CAPTAIN: 30,
  JOIN_TEAM: 15,
  FEEDBACK: 20,
};

// Helper to round any score to nearest 0.5 step (e.g., 7, 7.5, 8, 8.5, 9, 9.5, 10)
function roundHalf(val: unknown, fallback = 8): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.min(10, Math.max(1, n));
  return Math.round(clamped * 2) / 2;
}

// 10 Dishes total — all scores strictly in 0.5 or whole-number increments
const INITIAL_FOODS: FoodItem[] = [
  {
    id: 1,
    name: 'Phở Bò Tái Lăn Lý Quốc Sư',
    category: 'pho',
    description: 'Nước dùng ninh xương ống bò 16 tiếng thanh ngọt đậm vị thảo quả, thịt bò thăn xào tái lăn thơm dậy mùi tỏi phi và hành lá tươi.',
    price: 55000,
    distance: 0.4,
    image: '/src/assets/images/food_pho_bo_1791445652067.jpg',
    adminScores: { ngon: 9.5, bo: 9, gia: 7.5, no: 8.5, khoangcach: 9.5 },
    scores: { ngon: 9, bo: 9, gia: 8, no: 8.5, khoangcach: 9.5 },
    reviewCount: 4,
  },
  {
    id: 2,
    name: 'Bún Chả Hàng Mành Nướng Than Hoa',
    category: 'bun',
    description: 'Chả viên và chả miếng ba chỉ tẩm ướp mật ong nướng quạt than hoa xém cạnh, ăn kèm nước mắm đu đủ xanh chua ngọt và rau sống tươi.',
    price: 45000,
    distance: 0.6,
    image: '/src/assets/images/food_bun_cha_1791445662891.jpg',
    adminScores: { ngon: 9, bo: 8, gia: 9, no: 9, khoangcach: 8.5 },
    scores: { ngon: 9, bo: 8, gia: 8.5, no: 9, khoangcach: 9 },
    reviewCount: 3,
  },
  {
    id: 3,
    name: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    category: 'com',
    description: 'Sườn cốt lết nướng sả mật ong dày mềm, bì thính giòn sật, chả trứng hấp nấm mèo và trứng ốp la lòng đào rưới mỡ hành béo ngậy.',
    price: 50000,
    distance: 0.5,
    image: '/src/assets/images/food_com_tam_1791445675670.jpg',
    adminScores: { ngon: 9, bo: 9, gia: 8, no: 9.5, khoangcach: 9 },
    scores: { ngon: 9, bo: 9, gia: 8.5, no: 9.5, khoangcach: 9 },
    reviewCount: 3,
  },
  {
    id: 4,
    name: 'Miến Ngan Trộn Măng Khô Phố Cổ',
    category: 'mien',
    description: 'Sợi miến dong dai giòn trộn xì dầu tỏi ớt, thịt ngan luộc mềm ngọt, măng tiết ninh kỹ, hành phi giòn rụm và lạc rang bùi.',
    price: 40000,
    distance: 0.3,
    image: '/src/assets/images/food_mien_ngan_1791445686265.jpg',
    adminScores: { ngon: 8.5, bo: 9, gia: 9.5, no: 8, khoangcach: 9.5 },
    scores: { ngon: 8.5, bo: 8.5, gia: 9, no: 8, khoangcach: 9.5 },
    reviewCount: 2,
  },
  {
    id: 5,
    name: 'Bún Bò Huế Giò Heo Chả Cua',
    category: 'bun',
    description: 'Nước lèo sả ớt mắm ruốc Huế chuẩn vị, bắp bò hoa thái mỏng, chả cua viên tươi ngọt, móng giò hầm mềm và rau chuối bào.',
    price: 50000,
    distance: 0.8,
    image: '/src/assets/images/food_bun_bo_hue_1791445697699.jpg',
    adminScores: { ngon: 9.5, bo: 9, gia: 8, no: 9.5, khoangcach: 8 },
    scores: { ngon: 9.5, bo: 9, gia: 8.5, no: 9, khoangcach: 8 },
    reviewCount: 3,
  },
  {
    id: 6,
    name: 'Phở Gà Ta Tràng Trứng Non',
    category: 'pho',
    description: 'Gà ta thả vườn da giòn vàng óng, tràng trứng non béo bùi, nước dùng gà trong vắt điểm lá chanh thái chỉ thơm lừng.',
    price: 45000,
    distance: 0.5,
    image: '/src/assets/images/food_pho_bo_1791445652067.jpg',
    adminScores: { ngon: 9, bo: 9, gia: 8.5, no: 8.5, khoangcach: 9 },
    scores: { ngon: 9, bo: 9, gia: 8.5, no: 8.5, khoangcach: 9 },
    reviewCount: 2,
  },
  {
    id: 7,
    name: 'Bún Thịt Nướng Nem Lụi Đà Nẵng',
    category: 'mien',
    description: 'Thịt heo nướng vỉ thơm lừng, nem lụi sả cây giòn dai, chan nước sốt tương đậu phộng gan heo sánh mịn đậm đà.',
    price: 42000,
    distance: 0.7,
    image: '/src/assets/images/food_bun_cha_1791445662891.jpg',
    adminScores: { ngon: 8.5, bo: 8, gia: 9, no: 8.5, khoangcach: 8.5 },
    scores: { ngon: 8.5, bo: 8, gia: 9, no: 8.5, khoangcach: 8.5 },
    reviewCount: 2,
  },
  {
    id: 8,
    name: 'Cơm Gà Xối Mỡ Da Giòn',
    category: 'com',
    description: 'Đùi gà góc tư xối mỡ giòn tan bên ngoài, mọng nước bên trong, dùng kèm cơm rang tỏi hạt tơi vàng và canh rong biển.',
    price: 48000,
    distance: 0.4,
    image: '/src/assets/images/food_com_tam_1791445675670.jpg',
    adminScores: { ngon: 9, bo: 8.5, gia: 8.5, no: 9.5, khoangcach: 9.5 },
    scores: { ngon: 9, bo: 8.5, gia: 8.5, no: 9.5, khoangcach: 9 },
    reviewCount: 2,
  },
  {
    id: 9,
    name: 'Bún Cá Rô Đồng Chả Cá Thu',
    category: 'bun',
    description: 'Cá rô đồng chiên giòn rụm kèm chả cá thu dã tay dai ngọt, nước dùng chua thanh từ dọc mùng, cà chua và thì là tươi.',
    price: 40000,
    distance: 0.5,
    image: '/src/assets/images/food_bun_bo_hue_1791445697699.jpg',
    adminScores: { ngon: 9, bo: 9, gia: 9, no: 8.5, khoangcach: 9 },
    scores: { ngon: 8.5, bo: 9, gia: 9, no: 8.5, khoangcach: 9 },
    reviewCount: 3,
  },
  {
    id: 10,
    name: 'Miến Lươn Giòn Nghệ An',
    category: 'mien',
    description: 'Lươn đồng tẩm bột chiên giòn tan đậm vị nghệ và hành tăm, chan nước dùng xương lươn ngọt lịm kèm rau răm thơm nồng.',
    price: 50000,
    distance: 0.6,
    image: '/src/assets/images/food_mien_ngan_1791445686265.jpg',
    adminScores: { ngon: 9.5, bo: 9.5, gia: 8, no: 8.5, khoangcach: 8.5 },
    scores: { ngon: 9, bo: 9, gia: 8.5, no: 8.5, khoangcach: 8.5 },
    reviewCount: 2,
  },
];

const daysAgo = (days: number, hoursOffset = 2) =>
  new Date(Date.now() - (days * 24 + hoursOffset) * 3600 * 1000).toISOString();

const registeredUsers = new Set<string>(['MINH ANH', 'HOÀNG NAM', 'THẢO LINH', 'ĐỨC HUY']);

const activityLogs: ActivityLog[] = [
  {
    id: 1,
    userName: 'MINH ANH',
    type: 'captain',
    points: POINT_RULES.CAPTAIN,
    description: 'Làm Captain lập team ăn Phở Bò Tái Lăn Lý Quốc Sư',
    foodId: 1,
    foodName: 'Phở Bò Tái Lăn Lý Quốc Sư',
    createdAt: daysAgo(0, 1),
  },
  {
    id: 2,
    userName: 'MINH ANH',
    type: 'feedback',
    points: POINT_RULES.FEEDBACK,
    description: 'Gửi đánh giá chi tiết cho Phở Bò Tái Lăn Lý Quốc Sư',
    foodId: 1,
    foodName: 'Phở Bò Tái Lăn Lý Quốc Sư',
    createdAt: daysAgo(1, 3),
  },
  {
    id: 3,
    userName: 'MINH ANH',
    type: 'eat',
    points: POINT_RULES.EAT,
    description: 'Đi ăn Bún Chả Hàng Mành Nướng Than Hoa',
    foodId: 2,
    foodName: 'Bún Chả Hàng Mành Nướng Than Hoa',
    amountSpent: 45000,
    createdAt: daysAgo(2, 4),
  },
  {
    id: 4,
    userName: 'HOÀNG NAM',
    type: 'join_team',
    points: POINT_RULES.JOIN_TEAM,
    description: 'Gia nhập team Phở Bò Tái Lăn Lý Quốc Sư',
    foodId: 1,
    foodName: 'Phở Bò Tái Lăn Lý Quốc Sư',
    createdAt: daysAgo(0, 1),
  },
  {
    id: 5,
    userName: 'HOÀNG NAM',
    type: 'feedback',
    points: POINT_RULES.FEEDBACK,
    description: 'Gửi đánh giá chi tiết cho Cơm Tấm Sườn Bì Chả Sài Gòn',
    foodId: 3,
    foodName: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    createdAt: daysAgo(2, 2),
  },
  {
    id: 6,
    userName: 'HOÀNG NAM',
    type: 'eat',
    points: POINT_RULES.EAT,
    description: 'Đi ăn Cơm Tấm Sườn Bì Chả Sài Gòn',
    foodId: 3,
    foodName: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    amountSpent: 50000,
    createdAt: daysAgo(3, 5),
  },
  {
    id: 7,
    userName: 'THẢO LINH',
    type: 'captain',
    points: POINT_RULES.CAPTAIN,
    description: 'Làm Captain lập team ăn Cơm Tấm Sườn Bì Chả Sài Gòn',
    foodId: 3,
    foodName: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    createdAt: daysAgo(0, 2),
  },
  {
    id: 8,
    userName: 'THẢO LINH',
    type: 'feedback',
    points: POINT_RULES.FEEDBACK,
    description: 'Gửi đánh giá chi tiết cho Bún Bò Huế Giò Heo Chả Cua',
    foodId: 5,
    foodName: 'Bún Bò Huế Giò Heo Chả Cua',
    createdAt: daysAgo(4, 2),
  },
  {
    id: 9,
    userName: 'ĐỨC HUY',
    type: 'join_team',
    points: POINT_RULES.JOIN_TEAM,
    description: 'Gia nhập team Phở Bò Tái Lăn Lý Quốc Sư',
    foodId: 1,
    foodName: 'Phở Bò Tái Lăn Lý Quốc Sư',
    createdAt: daysAgo(0, 1),
  },
  {
    id: 10,
    userName: 'THẢO LINH',
    type: 'captain',
    points: POINT_RULES.CAPTAIN,
    description: 'Làm Captain lập team ăn Miến Ngan Trộn Măng Khô Phố Cổ',
    foodId: 4,
    foodName: 'Miến Ngan Trộn Măng Khô Phố Cổ',
    createdAt: daysAgo(11, 3),
  },
  {
    id: 11,
    userName: 'MINH ANH',
    type: 'captain',
    points: POINT_RULES.CAPTAIN,
    description: 'Làm Captain lập team ăn Bún Bò Huế Giò Heo Chả Cua',
    foodId: 5,
    foodName: 'Bún Bò Huế Giò Heo Chả Cua',
    createdAt: daysAgo(14, 2),
  },
  {
    id: 12,
    userName: 'ĐỨC HUY',
    type: 'eat',
    points: POINT_RULES.EAT,
    description: 'Đi ăn Phở Gà Ta Tràng Trứng Non',
    foodId: 6,
    foodName: 'Phở Gà Ta Tràng Trứng Non',
    amountSpent: 45000,
    createdAt: daysAgo(15, 4),
  },
  {
    id: 13,
    userName: 'HOÀNG NAM',
    type: 'captain',
    points: POINT_RULES.CAPTAIN,
    description: 'Làm Captain lập team ăn Cơm Gà Xối Mỡ Da Giòn',
    foodId: 8,
    foodName: 'Cơm Gà Xối Mỡ Da Giòn',
    createdAt: daysAgo(38, 2),
  },
  {
    id: 14,
    userName: 'ĐỨC HUY',
    type: 'feedback',
    points: POINT_RULES.FEEDBACK,
    description: 'Gửi đánh giá chi tiết cho Miến Ngan Trộn Măng Khô Phố Cổ',
    foodId: 4,
    foodName: 'Miến Ngan Trộn Măng Khô Phố Cổ',
    createdAt: daysAgo(42, 3),
  },
];

// All feedback scores strictly in 0.5 increments
const feedbacksStore: FoodFeedback[] = [
  {
    id: 201,
    foodId: 1,
    foodName: 'Phở Bò Tái Lăn Lý Quốc Sư',
    userName: 'MINH ANH',
    scores: { ngon: 9.5, bo: 9, gia: 8, no: 9, khoangcach: 9.5 },
    comment: 'Nước phở cực kỳ thơm mùi gừng nướng và thảo quả, thịt bò xào tái lăn mềm không bị dai, đi bộ từ văn phòng chỉ mất 5 phút.',
    createdAt: daysAgo(1, 3),
  },
  {
    id: 202,
    foodId: 3,
    foodName: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    userName: 'HOÀNG NAM',
    scores: { ngon: 9, bo: 9, gia: 8.5, no: 9.5, khoangcach: 9 },
    comment: 'Miếng sườn nướng dày và ướp thấm vị mật ong, ăn một đĩa là no căng bụng tới chiều tối. Nước mắm kẹo chuẩn vị Sài Gòn.',
    createdAt: daysAgo(2, 2),
  },
  {
    id: 203,
    foodId: 5,
    foodName: 'Bún Bò Huế Giò Heo Chả Cua',
    userName: 'THẢO LINH',
    scores: { ngon: 9.5, bo: 9, gia: 8.5, no: 9, khoangcach: 8 },
    comment: 'Chả cua dai ngọt tự nhiên, nước lèo đậm đà vị ruốc Huế, thêm chút sa tế ớt chưng của quán là xuất sắc.',
    createdAt: daysAgo(4, 2),
  },
];

let teamsStore: TeamItem[] = [
  {
    id: 101,
    teamName: 'Hội Săn Phở Trưa Thứ 5',
    foodId: 1,
    foodName: 'Phở Bò Tái Lăn Lý Quốc Sư',
    captainName: 'MINH ANH',
    members: ['HOÀNG NAM', 'ĐỨC HUY'],
    qrUrl: null,
    status: 'open',
    createdAt: daysAgo(0, 1),
  },
  {
    id: 102,
    teamName: 'Team Cơm Tấm Full Topping',
    foodId: 3,
    foodName: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    captainName: 'THẢO LINH',
    members: [],
    qrUrl: null,
    status: 'open',
    createdAt: daysAgo(0, 2),
  },
];

const contactsStore: ContactSubmission[] = [];

function computeTitles(profile: {
  elo: number;
  mealsCount: number;
  teamsHosted: number;
  teamsJoined: number;
  feedbacksCount: number;
}): string[] {
  const titles: string[] = [];
  if (profile.elo >= 80) titles.push('Chiến Thần Hoạt Động');
  else if (profile.elo >= 40) titles.push('Thực Thần Năng Nổ');
  else if (profile.elo > 0) titles.push('Thành Viên Tích Cực');
  else titles.push('Tân Binh (0 AP)');

  if (profile.teamsHosted >= 2) titles.push('Captain Nhiệt Huyết');
  else if (profile.teamsHosted === 1) titles.push('Người Mở Đường');

  if (profile.feedbacksCount >= 2) titles.push('Nhà Phê Bình Ẩm Thực');
  if (profile.mealsCount + profile.teamsJoined >= 2) titles.push('Đồng Đội Ăn Ý');

  return titles.slice(0, 3);
}

function buildUserProfile(
  userName: string,
  fromDate?: Date | null,
  toDate?: Date | null
): UserProfile {
  const userActivities = activityLogs.filter((log) => {
    if (log.userName !== userName) return false;
    const t = new Date(log.createdAt).getTime();
    if (fromDate && t < fromDate.getTime()) return false;
    if (toDate && t > toDate.getTime()) return false;
    return true;
  });

  let elo = 0;
  let mealsCount = 0;
  let teamsHosted = 0;
  let teamsJoined = 0;
  let feedbacksCount = 0;
  let totalSpent = 0;

  for (const act of userActivities) {
    elo += act.points;
    if (act.type === 'eat') {
      mealsCount += 1;
      totalSpent += act.amountSpent || 0;
    } else if (act.type === 'captain') {
      teamsHosted += 1;
    } else if (act.type === 'join_team') {
      teamsJoined += 1;
    } else if (act.type === 'feedback') {
      feedbacksCount += 1;
    }
  }

  const titles = computeTitles({
    elo,
    mealsCount,
    teamsHosted,
    teamsJoined,
    feedbacksCount,
  });

  return {
    name: userName,
    elo,
    mealsCount,
    teamsHosted,
    teamsJoined,
    feedbacksCount,
    totalSpent,
    titles,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.get('/api/foods', (_req: Request, res: Response) => {
    res.json(INITIAL_FOODS);
  });

  app.get('/api/foods/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const food = INITIAL_FOODS.find((f) => f.id === id);
    if (!food) {
      res.status(404).json({ error: 'Không tìm thấy món ăn.' });
      return;
    }
    res.json(food);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const rawName = String(req.body?.name || '').trim().toUpperCase();
    if (!rawName || rawName.length < 2 || rawName.length > 32) {
      res.status(400).json({ error: 'Tên phải từ 2 đến 32 ký tự.' });
      return;
    }
    registeredUsers.add(rawName);
    const userProfile = buildUserProfile(rawName);
    res.json(userProfile);
  });

  app.get('/api/leaderboard', (req: Request, res: Response) => {
    const period = String(req.query.period || 'all');

    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    const now = new Date();

    if (period === 'week') {
      fromDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
    } else if (period === 'month') {
      fromDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
    }

    const profiles = Array.from(registeredUsers).map((name) =>
      buildUserProfile(name, fromDate, toDate)
    );

    profiles.sort((a, b) => {
      if (b.elo !== a.elo) return b.elo - a.elo;
      return b.teamsHosted - a.teamsHosted;
    });

    res.json({
      leaderboard: profiles,
      pointRules: POINT_RULES,
    });
  });

  app.get('/api/feedbacks', (req: Request, res: Response) => {
    const foodId = req.query.foodId ? Number(req.query.foodId) : null;
    if (foodId) {
      res.json(feedbacksStore.filter((fb) => fb.foodId === foodId));
      return;
    }
    res.json(feedbacksStore);
  });

  // POST /api/feedbacks — scores strictly rounded to 0.5 increments
  app.post('/api/feedbacks', (req: Request, res: Response) => {
    const userName = String(req.body?.userName || '').trim().toUpperCase();
    const foodId = Number(req.body?.foodId);
    const comment = String(req.body?.comment || '').trim();
    const rawScores = req.body?.scores || {};

    if (!userName) {
      res.status(400).json({ error: 'Vui lòng đăng nhập để gửi feedback món ăn.' });
      return;
    }

    const food = INITIAL_FOODS.find((f) => f.id === foodId);
    if (!food) {
      res.status(404).json({ error: 'Vui lòng chọn món ăn hợp lệ.' });
      return;
    }

    const scores: FoodScores = {
      ngon: roundHalf(rawScores.ngon),
      bo: roundHalf(rawScores.bo),
      gia: roundHalf(rawScores.gia),
      no: roundHalf(rawScores.no),
      khoangcach: roundHalf(rawScores.khoangcach),
    };

    if (!comment || comment.length < 10) {
      res.status(422).json({
        error: 'Nhận xét món ăn cần tối thiểu 10 ký tự để chia sẻ trải nghiệm thực tế.',
      });
      return;
    }

    const newFeedback: FoodFeedback = {
      id: Date.now(),
      foodId: food.id,
      foodName: food.name,
      userName,
      scores,
      comment,
      createdAt: new Date().toISOString(),
    };

    feedbacksStore.unshift(newFeedback);

    // Recalculate running average and snap to nearest 0.5 step
    const prevCount = food.reviewCount || 1;
    const nextCount = prevCount + 1;
    food.scores = {
      ngon: roundHalf((food.scores.ngon * prevCount + scores.ngon) / nextCount),
      bo: roundHalf((food.scores.bo * prevCount + scores.bo) / nextCount),
      gia: roundHalf((food.scores.gia * prevCount + scores.gia) / nextCount),
      no: roundHalf((food.scores.no * prevCount + scores.no) / nextCount),
      khoangcach: roundHalf(
        (food.scores.khoangcach * prevCount + scores.khoangcach) / nextCount
      ),
    };
    food.reviewCount = nextCount;

    registeredUsers.add(userName);
    activityLogs.unshift({
      id: Date.now() + 1,
      userName,
      type: 'feedback',
      points: POINT_RULES.FEEDBACK,
      description: `Feedback món ${food.name}`,
      foodId: food.id,
      foodName: food.name,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      feedback: newFeedback,
      updatedFood: food,
      userProfile: buildUserProfile(userName),
    });
  });

  app.get('/api/teams', (req: Request, res: Response) => {
    const status = req.query.status;
    if (status === 'open') {
      res.json(teamsStore.filter((t) => t.status === 'open'));
      return;
    }
    res.json(teamsStore);
  });

  app.post('/api/teams', (req: Request, res: Response) => {
    const foodId = Number(req.body?.foodId);
    const foodName = String(req.body?.foodName || '').trim();
    const captainName = String(req.body?.captainName || '').trim().toUpperCase();
    const customTeamName = String(req.body?.teamName || '').trim();
    const qrDataUrl = req.body?.qrDataUrl ? String(req.body.qrDataUrl) : null;

    if (!foodId || !foodName || !captainName) {
      res.status(400).json({ error: 'Thiếu thông tin tạo team.' });
      return;
    }

    const existingActiveTeam = teamsStore.find(
      (t) =>
        t.status === 'open' &&
        (t.captainName === captainName || t.members.includes(captainName))
    );
    if (existingActiveTeam) {
      res.status(400).json({
        error: `Bạn đang ở trong "${existingActiveTeam.teamName}". Mỗi người chỉ có thể tham gia 1 team tại một thời điểm (hãy thoát hoặc đóng team hiện tại trước).`,
      });
      return;
    }

    const finalTeamName = customTeamName || `Team ${foodName}`;

    const newTeam: TeamItem = {
      id: Date.now(),
      teamName: finalTeamName,
      foodId,
      foodName,
      captainName,
      members: [],
      qrUrl: qrDataUrl,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    teamsStore.unshift(newTeam);

    registeredUsers.add(captainName);
    activityLogs.unshift({
      id: Date.now() + 1,
      userName: captainName,
      type: 'captain',
      points: POINT_RULES.CAPTAIN,
      description: `Làm Captain lập "${finalTeamName}" (${foodName})`,
      foodId,
      foodName,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(newTeam);
  });

  app.post('/api/teams/:id/join', (req: Request, res: Response) => {
    const teamId = Number(req.params.id);
    const userName = String(req.body?.userName || '').trim().toUpperCase();
    const team = teamsStore.find((t) => t.id === teamId && t.status === 'open');

    if (!team) {
      res.status(404).json({ error: 'Team không tồn tại hoặc đã đóng.' });
      return;
    }
    if (!userName) {
      res.status(400).json({ error: 'Vui lòng đăng nhập trước khi gia nhập.' });
      return;
    }
    if (team.captainName === userName || team.members.includes(userName)) {
      res.status(400).json({ error: 'Bạn đã ở trong team này rồi.' });
      return;
    }

    const anotherOpenTeam = teamsStore.find(
      (t) =>
        t.status === 'open' &&
        t.id !== teamId &&
        (t.captainName === userName || t.members.includes(userName))
    );
    if (anotherOpenTeam) {
      res.status(400).json({
        error: `Bạn đang tham gia "${anotherOpenTeam.teamName}". Không thể gia nhập cùng lúc 2 team! Hãy thoát khỏi team cũ trước.`,
      });
      return;
    }

    team.members.push(userName);

    registeredUsers.add(userName);
    activityLogs.unshift({
      id: Date.now(),
      userName,
      type: 'join_team',
      points: POINT_RULES.JOIN_TEAM,
      description: `Gia nhập "${team.teamName}"`,
      foodId: team.foodId,
      foodName: team.foodName,
      createdAt: new Date().toISOString(),
    });

    res.json(team);
  });

  app.post('/api/teams/:id/leave', (req: Request, res: Response) => {
    const teamId = Number(req.params.id);
    const userName = String(req.body?.userName || '').trim().toUpperCase();
    const team = teamsStore.find((t) => t.id === teamId && t.status === 'open');

    if (!team) {
      res.status(404).json({ error: 'Team không tồn tại hoặc đã đóng.' });
      return;
    }
    if (!userName) {
      res.status(400).json({ error: 'Thiếu thông tin người dùng.' });
      return;
    }

    if (team.captainName === userName) {
      if (team.members.length > 0) {
        team.captainName = team.members[0];
        team.members = team.members.slice(1);
      } else {
        team.status = 'closed';
      }
      res.json(team);
      return;
    }

    if (!team.members.includes(userName)) {
      res.status(400).json({ error: 'Bạn không có trong team này.' });
      return;
    }

    team.members = team.members.filter((m) => m !== userName);
    res.json(team);
  });

  app.put('/api/teams/:id/close', (req: Request, res: Response) => {
    const teamId = Number(req.params.id);
    const team = teamsStore.find((t) => t.id === teamId);
    if (!team) {
      res.status(404).json({ error: 'Không tìm thấy team.' });
      return;
    }
    team.status = 'closed';
    res.json(team);
  });

  app.post('/api/contact', (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const dishOrPlace = String(req.body?.dishOrPlace || '').trim();
    const message = String(req.body?.message || '').trim();

    const fieldErrors: Record<string, string> = {};

    if (!name || name.length < 2) {
      fieldErrors.name = 'Họ và tên phải có ít nhất 2 ký tự.';
    } else if (name.length > 60) {
      fieldErrors.name = 'Họ và tên không được vượt quá 60 ký tự.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email) {
      fieldErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(email)) {
      fieldErrors.email = 'Địa chỉ email không đúng định dạng (ví dụ: ten@domain.com).';
    }

    const allowedSubjects = ['gop-y-mon', 'de-xuat-quan', 'hop-tac', 'bao-loi'];
    if (!allowedSubjects.includes(subject)) {
      fieldErrors.subject = 'Vui lòng chọn chủ đề liên hệ hợp lệ.';
    }

    if (dishOrPlace.length > 80) {
      fieldErrors.dishOrPlace = 'Tên món/quán không được vượt quá 80 ký tự.';
    }

    if (!message || message.length < 15) {
      fieldErrors.message = 'Nội dung góp ý phải có tối thiểu 15 ký tự để chúng tôi hiểu rõ chi tiết.';
    } else if (message.length > 1000) {
      fieldErrors.message = 'Nội dung góp ý không được vượt quá 1000 ký tự.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      res.status(422).json({
        error: 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại các trường bên dưới.',
        fieldErrors,
      });
      return;
    }

    const submission: ContactSubmission = {
      id: Date.now(),
      name,
      email,
      subject: subject as ContactSubmission['subject'],
      dishOrPlace: dishOrPlace || undefined,
      message,
      createdAt: new Date().toISOString(),
    };

    contactsStore.unshift(submission);

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn! Đóng góp của bạn đã được hệ thống xác thực và lưu trữ thành công.',
      submission,
    });
  });

  app.get('/api/contact', (_req: Request, res: Response) => {
    res.json(contactsStore.slice(0, 5));
  });

  // ── ADMIN API ENDPOINTS ──
  app.get('/api/admin/overview', (_req: Request, res: Response) => {
    const allUsers = Array.from(registeredUsers).map((name) => buildUserProfile(name));
    allUsers.sort((a, b) => b.elo - a.elo);
    res.json({
      foods: INITIAL_FOODS,
      users: allUsers,
      teams: teamsStore,
      feedbacks: feedbacksStore,
      contacts: contactsStore,
      activityLogs: activityLogs.slice(0, 50),
      pointRules: POINT_RULES,
    });
  });

  // Admin: Create a new dish
  app.post('/api/admin/foods', (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const categoryRaw = String(req.body?.category || 'pho').trim();
    const category = (['pho', 'bun', 'com', 'mien'].includes(categoryRaw)
      ? categoryRaw
      : 'pho') as FoodItem['category'];
    const description = String(req.body?.description || '').trim();
    const price = Math.max(1000, Number(req.body?.price) || 45000);
    const distance = Math.max(0.1, Number(req.body?.distance) || 0.5);
    const image =
      String(req.body?.image || '').trim() ||
      '/src/assets/images/food_pho_bo_1791445652067.jpg';

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Tên món ăn phải có ít nhất 2 ký tự.' });
      return;
    }

    const rawAdmin = req.body?.adminScores || {};
    const adminScores: FoodScores = {
      ngon: roundHalf(rawAdmin.ngon, 9),
      bo: roundHalf(rawAdmin.bo, 8.5),
      gia: roundHalf(rawAdmin.gia, 8.5),
      no: roundHalf(rawAdmin.no, 9),
      khoangcach: roundHalf(rawAdmin.khoangcach, 9),
    };

    const newFood: FoodItem = {
      id: Date.now(),
      name,
      category,
      description:
        description ||
        'Món ngon được Admin tuyển chọn và thẩm định trực tiếp trên hệ thống Đánh giá 360.',
      price,
      distance: Math.round(distance * 10) / 10,
      image,
      adminScores,
      scores: { ...adminScores },
      reviewCount: 1,
    };

    INITIAL_FOODS.unshift(newFood);
    res.status(201).json(newFood);
  });

  // Admin: Update an existing dish & its Admin 360 scores
  app.put('/api/admin/foods/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const food = INITIAL_FOODS.find((f) => f.id === id);
    if (!food) {
      res.status(404).json({ error: 'Không tìm thấy món ăn cần chỉnh sửa.' });
      return;
    }

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) {
        res.status(400).json({ error: 'Tên món ăn không được để trống.' });
        return;
      }
      food.name = name;
    }

    if (req.body?.category && ['pho', 'bun', 'com', 'mien'].includes(req.body.category)) {
      food.category = req.body.category;
    }
    if (req.body?.description !== undefined) {
      food.description = String(req.body.description).trim();
    }
    if (req.body?.price !== undefined) {
      food.price = Math.max(1000, Number(req.body.price) || food.price);
    }
    if (req.body?.distance !== undefined) {
      food.distance = Math.max(0.1, Math.round(Number(req.body.distance) * 10) / 10);
    }
    if (req.body?.image !== undefined && String(req.body.image).trim()) {
      food.image = String(req.body.image).trim();
    }

    if (req.body?.adminScores) {
      const rawAdmin = req.body.adminScores;
      food.adminScores = {
        ngon: roundHalf(rawAdmin.ngon, food.adminScores.ngon),
        bo: roundHalf(rawAdmin.bo, food.adminScores.bo),
        gia: roundHalf(rawAdmin.gia, food.adminScores.gia),
        no: roundHalf(rawAdmin.no, food.adminScores.no),
        khoangcach: roundHalf(rawAdmin.khoangcach, food.adminScores.khoangcach),
      };
    }

    if (req.body?.scores) {
      const rawComm = req.body.scores;
      food.scores = {
        ngon: roundHalf(rawComm.ngon, food.scores.ngon),
        bo: roundHalf(rawComm.bo, food.scores.bo),
        gia: roundHalf(rawComm.gia, food.scores.gia),
        no: roundHalf(rawComm.no, food.scores.no),
        khoangcach: roundHalf(rawComm.khoangcach, food.scores.khoangcach),
      };
    }

    res.json(food);
  });

  // Admin: Delete a dish
  app.delete('/api/admin/foods/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = INITIAL_FOODS.findIndex((f) => f.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy món ăn cần xóa.' });
      return;
    }
    const [removed] = INITIAL_FOODS.splice(idx, 1);
    res.json({ success: true, removed });
  });

  // Admin: Adjust user Activity Points (AP)
  app.post('/api/admin/users/adjust-points', (req: Request, res: Response) => {
    const userName = String(req.body?.userName || '').trim().toUpperCase();
    const points = Number(req.body?.points);
    const reason = String(req.body?.reason || '').trim() || 'Admin điều chỉnh điểm AP';

    if (!userName || userName.length < 2) {
      res.status(400).json({ error: 'Vui lòng chọn hoặc nhập tên thành viên hợp lệ.' });
      return;
    }
    if (!Number.isFinite(points) || points === 0) {
      res.status(400).json({ error: 'Số điểm điều chỉnh phải khác 0.' });
      return;
    }

    registeredUsers.add(userName);
    activityLogs.unshift({
      id: Date.now(),
      userName,
      type: 'captain',
      points,
      description: `[Admin] ${reason}`,
      createdAt: new Date().toISOString(),
    });

    const updatedProfile = buildUserProfile(userName);
    res.json({ success: true, profile: updatedProfile });
  });

  // Admin: Delete a user
  app.delete('/api/admin/users/:name', (req: Request, res: Response) => {
    const userName = String(req.params.name || '').trim().toUpperCase();
    if (!registeredUsers.has(userName)) {
      res.status(404).json({ error: 'Không tìm thấy thành viên.' });
      return;
    }
    registeredUsers.delete(userName);
    for (let i = activityLogs.length - 1; i >= 0; i--) {
      if (activityLogs[i].userName === userName) {
        activityLogs.splice(i, 1);
      }
    }
    res.json({ success: true, userName });
  });

  // Admin: Toggle team status (open / closed)
  app.put('/api/admin/teams/:id/toggle', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const team = teamsStore.find((t) => t.id === id);
    if (!team) {
      res.status(404).json({ error: 'Không tìm thấy team.' });
      return;
    }
    team.status = team.status === 'open' ? 'closed' : 'open';
    res.json(team);
  });

  // Admin: Delete a team
  app.delete('/api/admin/teams/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = teamsStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy team.' });
      return;
    }
    const [removed] = teamsStore.splice(idx, 1);
    res.json({ success: true, removed });
  });

  // Admin: Delete a feedback & recalculate dish community average
  app.delete('/api/admin/feedbacks/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = feedbacksStore.findIndex((fb) => fb.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy feedback.' });
      return;
    }
    const [removed] = feedbacksStore.splice(idx, 1);

    // Recalculate community average for that food
    const food = INITIAL_FOODS.find((f) => f.id === removed.foodId);
    if (food) {
      const remaining = feedbacksStore.filter((fb) => fb.foodId === food.id);
      if (remaining.length > 0) {
        const sum = remaining.reduce(
          (acc, fb) => ({
            ngon: acc.ngon + fb.scores.ngon,
            bo: acc.bo + fb.scores.bo,
            gia: acc.gia + fb.scores.gia,
            no: acc.no + fb.scores.no,
            khoangcach: acc.khoangcach + fb.scores.khoangcach,
          }),
          { ngon: 0, bo: 0, gia: 0, no: 0, khoangcach: 0 }
        );
        food.scores = {
          ngon: roundHalf(sum.ngon / remaining.length),
          bo: roundHalf(sum.bo / remaining.length),
          gia: roundHalf(sum.gia / remaining.length),
          no: roundHalf(sum.no / remaining.length),
          khoangcach: roundHalf(sum.khoangcach / remaining.length),
        };
        food.reviewCount = remaining.length;
      } else {
        food.scores = { ...food.adminScores };
        food.reviewCount = 1;
      }
    }

    res.json({ success: true, removed });
  });

  // Admin: Delete a contact submission
  app.delete('/api/admin/contacts/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = contactsStore.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy liên hệ.' });
      return;
    }
    const [removed] = contactsStore.splice(idx, 1);
    res.json({ success: true, removed });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

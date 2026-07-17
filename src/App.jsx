import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHIPS, SPEED_STEPS } from './gameData';
import { createAudioEngine } from './audioEngine';
import { cloudSyncConfigured, downloadCloudState, getCloudClient, sendMagicLink, signOutCloud, uploadCloudState } from './cloudSync';

const Icon = ({ name, size = 18 }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (name === 'pause') return <svg {...common}><path d="M8 5v14M16 5v14" /></svg>;
  if (name === 'play') return <svg {...common}><path d="m8 5 11 7-11 7Z" /></svg>;
  if (name === 'target') return <svg {...common}><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>;
  if (name === 'crosshair') return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg>;
  if (name === 'chevron') return <svg {...common}><path d="m8 10 4 4 4-4"/></svg>;
  if (name === 'restart') return <svg {...common}><path d="M4 4v6h6"/><path d="M5.7 17.2A8 8 0 1 0 6 6L4 10"/></svg>;
  if (name === 'line') return <svg {...common}><path d="M12 3v18"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="12" cy="15" r="1.5"/><circle cx="12" cy="20" r="1.5"/></svg>;
  if (name === 'ring') return <svg {...common}><circle cx="12" cy="12" r="7"/><circle cx="12" cy="5" r="1.3"/><circle cx="19" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/></svg>;
  if (name === 'waypoint') return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === 'ew') return <svg {...common}><path d="M5 19a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0M11 13a2 2 0 0 1 2 0"/><path d="M12 4v5"/></svg>;
  if (name === 'decoy') return <svg {...common}><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><circle cx="12" cy="12" r="3"/></svg>;
  if (name === 'missile') return <svg {...common}><path d="m14 4 6 6-9 9-5 1 1-5Z"/><path d="m14 4-3 7 7-3M7 15l-3-3M9 18l-3 3"/></svg>;
  if (name === 'aircraft') return <svg {...common}><path d="m12 3 2.2 6.2 6.8 3.3v2l-6.8-1.1-.8 5 2.6 1.7V21l-4-1-4 1v-.9l2.6-1.7-.8-5L3 14.5v-2l6.8-3.3Z"/></svg>;
  if (name === 'sonar') return <svg {...common}><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/></svg>;
  if (name === 'audio') return <svg {...common}><path d="M5 10v4h3l4 3V7L8 10Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>;
  if (name === 'muted') return <svg {...common}><path d="M5 10v4h3l4 3V7L8 10Z"/><path d="m16 10 5 5M21 10l-5 5"/></svg>;
  if (name === 'save') return <svg {...common}><path d="M5 4h12l2 2v14H5Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></svg>;
  return null;
};

const WEAPON_PROFILES = {
  f35: { range: 82, accuracy: .78, label: '航空攻撃' },
  essm: { range: 34, accuracy: .72, label: '艦対空' },
  sm2: { range: 58, accuracy: .76, label: '長距離SAM' },
  harpoon: { range: 68, accuracy: .79, label: '対艦ミサイル' },
  ciws: { range: 10, accuracy: .91, label: '近接防御' },
  sm3: { range: 64, accuracy: .71, label: '迎撃ミサイル' },
  ssm: { range: 72, accuracy: .82, label: '対艦ミサイル' },
  asroc: { range: 28, accuracy: .77, label: '対潜ロケット' },
  aster: { range: 44, accuracy: .76, label: '艦対空' },
  exocet: { range: 62, accuracy: .8, label: '対艦ミサイル' },
  torpedo: { range: 24, accuracy: .86, label: '魚雷' },
  type89: { range: 31, accuracy: .88, label: '魚雷' },
  subharpoon: { range: 57, accuracy: .78, label: '潜対艦ミサイル' },
};

const getWeaponProfile = (weapon) => WEAPON_PROFILES[weapon?.id] ?? { range: 45, accuracy: .74, label: '誘導兵装' };
const nauticalRange = (from, to) => Math.hypot(to.x - from.x, to.y - from.y) * 1.08;
const hitProbability = (distance, profile) => {
  if (distance > profile.range) return 0;
  const rangePressure = Math.max(0, distance / profile.range - .45) * .38;
  return Math.max(.42, Math.min(.94, profile.accuracy - rangePressure));
};
const conditionOf = (ship) => {
  const ratio = ship.hp / ship.maxHp;
  if (ratio <= 0) return 'MISSION KILL';
  if (ratio < .35) return 'CRITICAL';
  if (ratio < .7) return 'DAMAGED';
  return 'COMBAT READY';
};
const combatEfficiency = (ship) => Math.max(.42, 1 - (ship.fire ?? 0) * .0042 - (ship.flooding ?? 0) * .0035 - (1 - ship.hp / ship.maxHp) * .28);
const operationalSpeed = (ship) => ship.maxSpeed * Math.max(.34, 1 - (ship.fire ?? 0) / 220 - (ship.flooding ?? 0) / 150 - (1 - ship.hp / ship.maxHp) * .25);
const BLUE_IDS = SHIPS.filter(ship => ship.side === 'blue').map(ship => ship.id);
const ORANGE_TOTAL = SHIPS.filter(ship => ship.side === 'orange').length;
const BLUE_INDEX = new Map(BLUE_IDS.map((id, index) => [id, index]));
const REVERSED_SPEED_STEPS = SPEED_STEPS.slice().reverse();
const CONTACT_BUFFER = 13;
const AI_LABELS = {
  patrol: '哨戒',
  intercept: '接近',
  flank: '側面機動',
  attack: '攻撃位置',
  evade: '回避機動',
  retreat: '離脱',
};
const AIR_STATUS_LABELS = {
  ready: '飛行甲板待機',
  launching: '発艦中',
  cap: 'CAP哨戒',
  ingress: '攻撃進出',
  attack: '攻撃実行',
  returning: '帰投中',
  rearming: '再武装',
  diverted: '代替基地へ退避',
};
const SUB_DEPTH_LABELS = { periscope: '潜望鏡深度', deep: '深度潜航' };
const SCENARIOS = {
  pacific: {
    id: 'pacific', code: 'OPS-01', name: '北太平洋制海演習', objective: '制海権を確保',
    description: 'BLUE CELL全戦力でORANGE CELLを無力化する総合戦。',
    victory: 'all', airCadence: 32, airOffset: 8, missileCadence: 14, torpedoCadence: 22, scoreMultiplier: 1,
  },
  carrier: {
    id: 'carrier', code: 'OPS-02', name: '空母打撃群防衛', objective: 'CVN-78を防衛',
    description: 'HMS Queen Elizabethを撃破し、USS Gerald R. Fordを生還させる。',
    victory: 'carrier', airCadence: 22, airOffset: 5, missileCadence: 16, torpedoCadence: 26, scoreMultiplier: 1.15,
  },
  asw: {
    id: 'asw', code: 'OPS-03', name: '深海ハンター', objective: '敵潜水艦を捕捉',
    description: 'ROKS Dosan Ahn Changhoを無力化し、JS Oryuを生還させる。',
    victory: 'asw', airCadence: 38, airOffset: 12, missileCadence: 18, torpedoCadence: 14, scoreMultiplier: 1.2,
  },
};
const DIFFICULTIES = {
  cadet: { id: 'cadet', name: 'CADET', label: '士官候補生', detail: '脅威反応に猶予あり', accuracy: .82, damage: .82, eta: 3, scoreMultiplier: .8 },
  commander: { id: 'commander', name: 'COMMANDER', label: '指揮官', detail: '標準の交戦規則', accuracy: 1, damage: 1, eta: 0, scoreMultiplier: 1 },
  admiral: { id: 'admiral', name: 'ADMIRAL', label: '提督', detail: '高精度・高威力の敵攻撃', accuracy: 1.12, damage: 1.18, eta: -2, scoreMultiplier: 1.4 },
};
const CAMPAIGN_OPERATIONS = [
  { id: 'cold_lance', code: 'CP-01', name: '氷海の槍', callSign: 'COLD LANCE', scenarioId: 'pacific', difficultyId: 'cadet', bonus: 1.05, detail: '北方航路を掃討し、合同艦隊の進出路を確保する。' },
  { id: 'guardian_sky', code: 'CP-02', name: '空母の盾', callSign: 'GUARDIAN SKY', scenarioId: 'carrier', difficultyId: 'commander', bonus: 1.1, detail: '敵航空攻撃下でCVN-78を防衛し、敵空母を排除する。' },
  { id: 'silent_current', code: 'CP-03', name: '静かなる潮流', callSign: 'SILENT CURRENT', scenarioId: 'asw', difficultyId: 'commander', bonus: 1.15, detail: '潜水艦脅威を追跡し、戦略海峡の安全を回復する。' },
  { id: 'iron_tempest', code: 'CP-04', name: '鋼鉄の嵐', callSign: 'IRON TEMPEST', scenarioId: 'carrier', difficultyId: 'admiral', bonus: 1.25, detail: '高密度航空攻撃を突破し、打撃群を戦域に維持する。' },
  { id: 'pacific_crown', code: 'CP-05', name: '太平洋の冠', callSign: 'PACIFIC CROWN', scenarioId: 'pacific', difficultyId: 'admiral', bonus: 1.4, detail: '全戦力を投入する最終決戦で完全な制海権を確立する。' },
];
const PROFILE_STORAGE_KEY = 'pacific-shield.profile.v1';
const AUDIO_STORAGE_KEY = 'pacific-shield.audio.v1';
const BATTLE_STORAGE_KEY = 'pacific-shield.battle.v1';
const DEFAULT_PROFILE = {
  version: 1, xp: 0, credits: 2, missions: 0, victories: 0, totalScore: 0, bestScore: 0,
  medals: [], completed: {}, upgrades: { weapons: 0, defense: 0, damage: 0 }, campaign: { completed: [], stars: {} }, tutorialSeen: false,
};
const MEDALS = {
  first_victory: { id: 'first_victory', name: '初陣殊勲章', mark: 'Ⅰ', detail: '初めて任務に勝利' },
  precision: { id: 'precision', name: '精密射撃章', mark: '◎', detail: '3射以上・命中率70%以上' },
  guardian: { id: 'guardian', name: '艦隊防空章', mark: '◇', detail: '迎撃を2回以上成功' },
  sub_hunter: { id: 'sub_hunter', name: '対潜戦章', mark: 'S', detail: '深海ハンターを完遂' },
  air_ace: { id: 'air_ace', name: '航空優勢章', mark: 'A', detail: '航空攻撃を2回以上命中' },
  flawless: { id: 'flawless', name: '完全防衛章', mark: '★', detail: '全艦70%以上で勝利' },
  theater: { id: 'theater', name: '太平洋戦役章', mark: 'Ⅴ', detail: '北太平洋キャンペーンを完遂' },
};
const UPGRADE_TRACKS = {
  weapons: { id: 'weapons', name: '射撃管制', detail: '兵装命中率 +2.5% / Lv', mark: 'FC' },
  defense: { id: 'defense', name: '艦隊防空', detail: '迎撃弾・電子戦・囮を増強', mark: 'AD' },
  damage: { id: 'damage', name: '損傷統制', detail: '消火・排水・修理効果を強化', mark: 'DC' },
};
const TUTORIAL_STEPS = [
  { id: 'command', icon: 'target', eyebrow: 'STEP 01 · COMMAND', title: '指揮艦と目標を選択', body: '左側の艦隊一覧で指揮艦を選び、海上またはレーダー上の識別済みORANGE CELL艦を選択して目標をロックします。', tip: '未確認目標は探知圏へ接近するまで攻撃できません。', controls: [['CLICK', '艦艇選択'], ['RADAR', '目標指定']] },
  { id: 'maneuver', icon: 'waypoint', eyebrow: 'STEP 02 · MANEUVER', title: '艦隊を機動させる', body: '空いている海面をクリックすると艦隊移動地点を設定します。単縦陣は進出、輪形陣は空母防衛に適しています。', tip: 'A・Dまたは左右矢印で選択艦の針路を10度変更できます。', controls: [['CLICK', '移動地点'], ['A / D', '針路変更']] },
  { id: 'weapons', icon: 'crosshair', eyebrow: 'STEP 03 · ENGAGE', title: '射程と命中率を確認して攻撃', body: '下部の兵装を選び、TARGET LOCKの距離と命中予測を確認して発射します。兵装ごとに射程・威力・弾数が異なります。', tip: '射程外や未識別目標には発射できません。', controls: [['SPACE', '発射'], ['CLICK', '兵装選択']] },
  { id: 'air', icon: 'aircraft', eyebrow: 'STEP 04 · AIR POWER', title: 'F-35C航空隊を運用', body: 'CVN-78からCAPを発艦させると敵航空隊とミサイルを自動妨害します。識別済み目標には4機編隊の対艦攻撃を投入できます。', tip: '空母の火災・浸水が重大になると飛行甲板を使用できません。', controls: [['L', 'CAP発艦'], ['K', '対艦発艦']] },
  { id: 'defense', icon: 'shield', eyebrow: 'STEP 05 · DEFENSE', title: '接近脅威へ即応', body: 'ミサイル・航空攻撃には迎撃、電子戦、デコイを組み合わせます。魚雷には迎撃弾や電子戦が使えないため、音響囮で回避します。', tip: '警報の残り秒数と有限の防御資源を確認してください。', controls: [['I', '迎撃'], ['E', '電子戦'], ['C', 'デコイ']] },
  { id: 'asw', icon: 'sonar', eyebrow: 'STEP 06 · SURVIVE', title: '対潜戦と損傷統制', body: 'SS-511の深度・静粛航行を管理し、アクティブソナーで敵潜水艦を識別します。被弾後は消火・排水・応急修理で戦闘力を維持します。', tip: '準備完了です。任務目標を達成し、艦隊を生還させてください。', controls: [['Q', 'ソナー'], ['Z / X', '深度・静粛'], ['P', '一時停止']] },
];
const initialTargetIdForScenario = scenarioId => scenarioId === 'asw' ? 'dosan' : scenarioId === 'carrier' ? 'queen' : 'daring';
const rankForXp = (xp) => {
  if (xp >= 2500) return { name: 'ADMIRAL', label: '提督', next: null };
  if (xp >= 1400) return { name: 'CAPTAIN', label: '大佐', next: 2500 };
  if (xp >= 700) return { name: 'COMMANDER', label: '中佐', next: 1400 };
  if (xp >= 300) return { name: 'LIEUTENANT', label: '大尉', next: 700 };
  return { name: 'CADET', label: '士官候補生', next: 300 };
};
const normalizeProfile = stored => {
  if (!stored || stored.version !== 1) return DEFAULT_PROFILE;
  return {
      ...DEFAULT_PROFILE, ...stored,
      medals: Array.isArray(stored.medals) ? stored.medals.filter(id => MEDALS[id]) : [],
      completed: stored.completed && typeof stored.completed === 'object' ? stored.completed : {},
      upgrades: { ...DEFAULT_PROFILE.upgrades, ...(stored.upgrades ?? {}) },
      campaign: {
        completed: Array.isArray(stored.campaign?.completed) ? stored.campaign.completed.filter(id => CAMPAIGN_OPERATIONS.some(operation => operation.id === id)) : [],
        stars: stored.campaign?.stars && typeof stored.campaign.stars === 'object' ? stored.campaign.stars : {},
      },
    };
};
const loadProfile = () => {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    return normalizeProfile(JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY)));
  } catch { return DEFAULT_PROFILE; }
};
const loadAudioPreference = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(AUDIO_STORAGE_KEY) !== 'muted';
};
const normalizeSavedBattle = stored => {
  if (!stored || stored.version !== 1 || !Number.isFinite(stored.savedAt) || !stored.payload) return null;
  if (!SCENARIOS[stored.payload.scenarioId] || !DIFFICULTIES[stored.payload.difficultyId] || !Array.isArray(stored.payload.ships)) return null;
  return stored;
};
const loadSavedBattle = () => {
  if (typeof window === 'undefined') return null;
  try { return normalizeSavedBattle(JSON.parse(window.localStorage.getItem(BATTLE_STORAGE_KEY))); }
  catch { return null; }
};
const formatMissionTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const upgradeCost = level => level >= 3 ? null : level + 2;
const startingDefense = level => ({ interceptors: 8 + level * 2, ew: 100 + level * 15, decoys: 4 + level });
const startingDamageControl = level => ({ foam: 100 + level * 15, pumps: 100 + level * 15, spares: 3 + level });
const initialAirWing = () => ({
  status: 'ready', mission: null, aircraft: 0, available: 24, fuel: 100,
  phase: 0, x: 35, y: 58, targetId: null, sortieId: null,
});

const blueTargetScore = (ship, enemy) => {
  const rolePriority = ship.id === 'ford' ? 34 : ship.id === 'maya' || ship.id === 'burke' ? 18 : ship.id === 'oryu' ? 15 : 10;
  const damagePriority = (1 - ship.hp / ship.maxHp) * 34;
  const distancePenalty = Math.hypot(ship.x - enemy.x, ship.y - enemy.y) * .42;
  const stealthPenalty = ship.submarine ? (ship.depthMode === 'deep' ? 17 : 6) + (ship.silent ? 12 : 0) : 0;
  return rolePriority + damagePriority - distancePenalty - stealthPenalty;
};

const selectAiTarget = (enemy, blueShips) => {
  let bestTarget = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const ship of blueShips) {
    if (ship.hp <= 0) continue;
    const score = blueTargetScore(ship, enemy);
    if (score > bestScore) {
      bestScore = score;
      bestTarget = ship;
    }
  }
  return bestTarget;
};

const enemyTacticalStep = (ship, blueShips) => {
  const target = selectAiTarget(ship, blueShips);
  if (!target) return ship;
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const distance = Math.max(.01, Math.hypot(dx, dy));
  const toward = { x: dx / distance, y: dy / distance };
  const turnSide = ship.id.length % 2 === 0 ? 1 : -1;
  const cross = { x: -toward.y * turnSide, y: toward.x * turnSide };
  const damageRatio = ship.hp / ship.maxHp;
  const underFire = Math.max(0, (ship.underFire ?? 0) - 1);
  let mode = 'attack';
  let vector = cross;
  let orderedSpeed = Math.min(ship.maxSpeed, 24);

  if (ship.submarine && damageRatio > .3) {
    mode = underFire > 0 ? 'evade' : distance > 24 ? 'intercept' : 'attack';
    vector = underFire > 0 ? { x: cross.x - toward.x * .35, y: cross.y - toward.y * .35 } : distance > 24 ? toward : cross;
    orderedSpeed = underFire > 0 ? Math.min(ship.maxSpeed, 18) : Math.min(ship.maxSpeed, 10);
  } else if (damageRatio <= .3) {
    mode = 'retreat';
    vector = { x: -toward.x, y: -toward.y };
    orderedSpeed = ship.maxSpeed;
  } else if (underFire > 0) {
    mode = 'evade';
    vector = { x: cross.x - toward.x * .22, y: cross.y - toward.y * .22 };
    orderedSpeed = ship.maxSpeed;
  } else if (distance > 35) {
    mode = 'intercept';
    vector = toward;
    orderedSpeed = Math.min(ship.maxSpeed, 27);
  } else if (distance > 21) {
    mode = 'flank';
    vector = { x: toward.x * .62 + cross.x * .78, y: toward.y * .62 + cross.y * .78 };
    orderedSpeed = Math.min(ship.maxSpeed, 25);
  } else {
    vector = { x: cross.x - toward.x * .12, y: cross.y - toward.y * .12 };
  }

  const vectorLength = Math.max(.01, Math.hypot(vector.x, vector.y));
  const step = Math.max(.16, orderedSpeed * .0095);
  const moveX = vector.x / vectorLength * step;
  const moveY = vector.y / vectorLength * step;
  const heading = (Math.atan2(moveY, moveX) * 180 / Math.PI + 90 + 360) % 360;
  return {
    ...ship,
    x: Math.max(10, Math.min(94, ship.x + moveX)),
    y: Math.max(12, Math.min(88, ship.y + moveY)),
    speed: orderedSpeed,
    heading,
    aiMode: mode,
    aiTargetId: target.id,
    underFire,
    ...(ship.submarine ? { depthMode: 'deep', silent: underFire === 0 } : {}),
  };
};

const formationTarget = (center, formation, index, heading) => {
  const rad = (heading - 90) * Math.PI / 180;
  if (formation === 'ring') {
    const ringOffsets = [[0, 0], [0, -6], [6, 0], [0, 6], [-6, 0]];
    const [baseX, baseY] = ringOffsets[index] ?? [0, 0];
    const rotatedX = baseX * Math.cos(rad) - baseY * Math.sin(rad);
    const rotatedY = baseX * Math.sin(rad) + baseY * Math.cos(rad);
    return { x: center.x + rotatedX, y: center.y + rotatedY };
  }
  const centeredIndex = index - (BLUE_IDS.length - 1) / 2;
  return { x: center.x + Math.cos(rad) * centeredIndex * 4.5, y: center.y + Math.sin(rad) * centeredIndex * 4.5 };
};

const buildContactStates = (enemies, blueShips, sonarPing = 0) => {
  const contacts = new Map();
  for (const enemy of enemies) {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let bestRange = 0;
    for (const blue of blueShips) {
      if (blue.hp <= 0) continue;
      const distance = nauticalRange(blue, enemy);
      const hullFactor = blue.hp / blue.maxHp < .35 ? .72 : 1;
      const damageFactor = hullFactor * Math.max(.5, 1 - (blue.fire ?? 0) * .004 - (blue.flooding ?? 0) * .003);
      const baseRange = enemy.submarine ? (blue.sonarRange ?? (blue.sensorRange ?? 25) * .7) : (blue.sensorRange ?? 25);
      const signature = enemy.submarine ? Math.min(1.15, (enemy.acoustic ?? .62) + enemy.speed * .018 + (enemy.silent ? -.14 : .08)) : 1;
      const activeBoost = enemy.submarine && sonarPing > 0 ? 18 : 0;
      const sensorRange = (baseRange * signature + activeBoost) * damageFactor;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        bestRange = sensorRange;
      }
    }
    const buffer = enemy.submarine ? 7 : CONTACT_BUFFER;
    const state = nearestDistance <= bestRange ? 'confirmed' : nearestDistance <= bestRange + buffer ? 'contact' : 'hidden';
    contacts.set(enemy.id, { state, distance: nearestDistance, sensorRange: bestRange, subsurface: Boolean(enemy.submarine) });
  }
  return contacts;
};

const threatPosition = (threat) => {
  const progress = Math.max(0, Math.min(1, (threat.maxEta - threat.eta) / threat.maxEta));
  return { x: threat.start.x + (threat.end.x - threat.start.x) * progress, y: threat.start.y + (threat.end.y - threat.start.y) * progress };
};

const moveToward = (from, to, ratio) => ({
  x: from.x + (to.x - from.x) * ratio,
  y: from.y + (to.y - from.y) * ratio,
});

const FleetRail = memo(({ ships, selectedId, onSelect }) => (
  <aside className="fleet-panel hud-panel" aria-label="艦隊一覧">
    <div className="panel-heading"><span>艦隊</span><span className="muted">BLUE CELL · {ships.filter(s => s.hp > 0).length}</span></div>
    <div className="fleet-list">
      {ships.map((ship) => (
        <button key={ship.id} className={`fleet-row ${selectedId === ship.id ? 'selected' : ''} ${ship.hp <= 0 ? 'destroyed' : ''}`} onClick={() => onSelect(ship.id)}>
          <div className="fleet-identity">
            <span className="flag">{ship.flag}</span>
            <span><strong>{ship.code}</strong><small>{ship.name}</small></span>
          </div>
          <span className="ship-type">{ship.role}</span>
          <span className="readiness">{ship.hp > 0 ? 'ON STATION' : 'MISSION KILL'}</span>
          <span className="health-track"><i style={{ width: `${Math.max(0, ship.hp / ship.maxHp * 100)}%` }} /></span>
        </button>
      ))}
    </div>
  </aside>
));

const ShipDetails = memo(({ ship }) => (
  <aside className="detail-panel hud-panel" aria-label="選択艦情報">
    <div className="detail-title"><div><strong>{ship.code}</strong><span>{ship.name}</span></div><span className="flag large">{ship.flag}</span></div>
    <div className="ship-portrait"><img src={ship.asset} alt="" /></div>
    <section><h3>ステータス</h3><InfoRow label="耐久力" value={`${Math.round(ship.hp).toLocaleString()} / ${ship.maxHp.toLocaleString()}`} meter={ship.hp / ship.maxHp} /><InfoRow label="速力" value={`${ship.speed.toFixed(1)} kt`} /><InfoRow label="針路" value={`${String(Math.round(ship.heading)).padStart(3, '0')}°`} /><InfoRow label="乗員" value={ship.crew} />{(ship.fire ?? 0) > 0 ? <InfoRow label="火災" value={`${Math.round(ship.fire)}%`} /> : null}{(ship.flooding ?? 0) > 0 ? <InfoRow label="浸水" value={`${Math.round(ship.flooding)}%`} /> : null}</section>
    <section><h3>センサー</h3><InfoRow label="レーダー" value={ship.radar} ok /><InfoRow label="探知圏" value={`${ship.sensorRange ?? 25} NM`} /><InfoRow label="ソナー" value={ship.sonar} ok /><InfoRow label="電子戦" value={ship.ew} ok /></section>
    <section><h3>兵装</h3>{ship.weapons.map(w => <InfoRow key={w.id} label={w.name} value={`${w.ammo}`} />)}</section>
  </aside>
));

const InfoRow = ({ label, value, meter, ok }) => (
  <div className="info-row"><span>{label}</span><b>{value}</b>{ok ? <i className="ok">✓</i> : null}{meter !== undefined ? <span className="mini-meter"><i style={{ width: `${meter * 100}%` }} /></span> : null}</div>
);

const BattleShip = memo(({ ship, selected, targeted, threatened, onSelect, onTarget }) => {
  if (ship.hp <= 0) return <div className="wreck" style={{ left: `${ship.x}%`, top: `${ship.y}%` }}><span /></div>;
  const condition = conditionOf(ship).toLowerCase().replace(' ', '-');
  return (
    <button className={`battle-ship ${ship.side} ${ship.submarine ? 'submarine' : ''} ${ship.depthMode ?? ''} ${condition} ${selected ? 'selected' : ''} ${targeted ? 'targeted' : ''} ${threatened ? 'threatened' : ''}`} style={{ left: `${ship.x}%`, top: `${ship.y}%`, '--heading': `${ship.heading - 45}deg`, '--ship-scale': ship.scale }} onClick={(event) => { event.stopPropagation(); ship.side === 'blue' ? onSelect(ship.id) : onTarget(ship.id); }} aria-label={`${ship.name}${ship.submarine ? ` ${SUB_DEPTH_LABELS[ship.depthMode] ?? '潜航中'}` : ''}${selected ? ' 選択中' : ''}${targeted ? ' 目標ロック中' : ship.side === 'orange' ? ' 目標指定' : ''}${threatened ? ' 脅威接近中' : ''}`}>
      {!ship.submarine || ship.depthMode === 'periscope' ? <span className="wake" /> : null}
      <img src={ship.asset} alt="" draggable="false" />
      <span className="ship-marker"><i />{ship.code}</span>
      {ship.submarine ? <span className="depth-marker">{SUB_DEPTH_LABELS[ship.depthMode] ?? '潜航中'}{ship.silent ? ' · 静粛' : ''}</span> : null}
      {ship.side === 'orange' && targeted ? <span className={`enemy-maneuver ${ship.aiMode ?? 'patrol'}`}>{AI_LABELS[ship.aiMode] ?? AI_LABELS.patrol}</span> : null}
      {threatened ? <span className="threat-ring" aria-hidden="true" /> : null}
      {condition !== 'combat-ready' ? <span className="damage-smoke" aria-hidden="true" /> : null}
      {(ship.fire ?? 0) > 4 ? <span className="fire-smoke" aria-hidden="true"><i/><i/></span> : null}
      {(ship.flooding ?? 0) > 20 ? <span className="flooding-marker" aria-hidden="true">FLOODING</span> : null}
    </button>
  );
});

const UnknownContact = memo(({ ship, onInspect }) => (
  <button className={`unknown-contact ${ship.submarine ? 'sonar-contact' : ''}`} style={{ left: `${ship.x}%`, top: `${ship.y}%` }} onClick={(event) => { event.stopPropagation(); onInspect(ship.id); }} aria-label={ship.submarine ? '未確認ソナー目標を追跡' : '未確認目標を追加索敵'}>
    <span /><strong>{ship.submarine ? 'SONAR CONTACT' : 'UNKNOWN'}</strong><small>{ship.submarine ? '音紋解析中' : '追加索敵が必要'}</small>
  </button>
));

const Radar = memo(({ ships, selectedId, targetId, onTarget, contactStates }) => (
  <div className="radar" aria-label="戦術レーダー">
    <span className="radar-sweep" /><span className="radar-n">N</span><span className="radar-e">E</span><span className="radar-s">S</span><span className="radar-w">W</span>
    {ships.filter(ship => ship.hp > 0 && (ship.side === 'blue' || contactStates.get(ship.id)?.state !== 'hidden')).map(ship => {
      const contactState = ship.side === 'orange' ? contactStates.get(ship.id)?.state : 'friendly';
      const label = contactState === 'confirmed' ? `${ship.code}をレーダーで目標指定` : contactState === 'contact' ? '未確認目標をレーダーで追跡' : ship.code;
      return <button key={ship.id} aria-label={label} onClick={() => ship.side === 'orange' && onTarget(ship.id)} className={`radar-blip ${ship.side} ${ship.submarine ? 'subsurface' : ''} ${contactState} ${ship.id === selectedId ? 'current' : ''} ${ship.id === targetId ? 'locked' : ''}`} style={{ left: `${18 + ship.x * .64}%`, top: `${18 + ship.y * .64}%` }} />;
    })}
    <b>20NM</b>
  </div>
));

const TargetPanel = memo(({ target, distance, chance, intentTargetCode }) => (
  <aside className="target-panel hud-panel" aria-label="ロック中の目標">
    <div className="target-heading"><span>TARGET LOCK</span><i /></div>
    <div className="target-name"><span className="flag">{target.flag}</span><div><strong>{target.code}</strong><small>{target.name}</small></div></div>
    <div className="target-metrics"><span>距離 <b>{distance.toFixed(1)} NM</b></span><span>命中予測 <b>{Math.round(chance * 100)}%</b></span></div>
    <div className="target-condition"><span>{conditionOf(target)}</span><i><b style={{ width: `${Math.max(0, target.hp / target.maxHp * 100)}%` }} /></i></div>
    <div className={`target-intent ${target.aiMode ?? 'patrol'}`}><span>戦術推定</span><b><i />{AI_LABELS[target.aiMode] ?? AI_LABELS.patrol}</b><small>目標 {intentTargetCode ?? '解析中'}</small></div>
  </aside>
));

const DefensePanel = memo(({ threat, defense, stats, onIntercept, onJam, onDecoy }) => {
  const threatLabel = threat?.kind === 'torpedo' ? 'TORPEDO' : threat?.kind === 'airraid' ? 'AIR RAID' : 'INCOMING';
  const decoyLabel = threat?.kind === 'torpedo' ? '音響囮' : threat?.kind === 'airraid' ? '回避支援' : 'デコイ';
  return (
    <aside className={`defense-panel hud-panel ${threat ? 'alert' : ''} ${threat?.kind ?? ''}`} aria-label="艦隊防御">
      <div className="defense-heading"><span>FLEET DEFENSE</span><i /></div>
      {threat ? <div className="threat-readout"><div><strong>{threatLabel}</strong><small>{threat.sourceCode} → {threat.targetCode}{threat.kind === 'airraid' ? ` · ${threat.aircraft}機` : ''}</small></div><output>{threat.eta}<small>SEC</small></output></div> : <div className="defense-clear"><Icon name="shield" size={18}/><span>防空・対潜圏クリア</span></div>}
      <div className="defense-actions">
        <button onClick={onIntercept} disabled={!threat || threat.kind === 'torpedo' || defense.interceptors <= 0}><Icon name="missile" size={17}/><span>{threat?.kind === 'airraid' ? '艦対空' : '迎撃'}</span><small>{defense.interceptors}</small></button>
        <button onClick={onJam} disabled={!threat || threat.kind === 'torpedo' || defense.ew < 25 || threat?.jammed} className={threat?.jammed ? 'active' : ''}><Icon name="ew" size={17}/><span>電子戦</span><small>{defense.ew}%</small></button>
        <button onClick={onDecoy} disabled={!threat || defense.decoys <= 0 || threat?.decoy} className={threat?.decoy ? 'active' : ''}><Icon name="decoy" size={17}/><span>{decoyLabel}</span><small>{defense.decoys}</small></button>
      </div>
      <div className="defense-footer"><span>迎撃 {stats.intercepts}</span><span>回避 {stats.evades}</span><span>被弾 {stats.hits}</span></div>
    </aside>
  );
});

const AirWingPanel = memo(({ wing, stats, carrierReady, strikeReady, onLaunch }) => {
  const ready = wing.status === 'ready';
  return (
    <aside className={`air-wing-panel hud-panel ${ready ? 'ready' : 'active'}`} aria-label="航空隊管制">
      <div className="air-wing-heading"><span>AIR WING · CVN-78</span><i /></div>
      <div className="air-wing-identity"><Icon name="aircraft" size={22}/><span><strong>VFA-147 · F-35C</strong><small>{AIR_STATUS_LABELS[wing.status] ?? wing.status}</small></span><b>{wing.aircraft || wing.available}<small>{ready ? 'READY' : 'AIRBORNE'}</small></b></div>
      <div className="air-wing-meter"><span>燃料 {Math.round(wing.fuel)}%</span><i><b style={{ width: `${wing.fuel}%` }} /></i><small>出撃 {stats.sorties} · 命中 {stats.hits} · CAP {stats.cap}</small></div>
      <div className="air-wing-actions">
        <button onClick={() => onLaunch('cap')} disabled={!ready || !carrierReady}><Icon name="shield" size={15}/><span>CAP発艦</span><small>2機</small></button>
        <button onClick={() => onLaunch('strike')} disabled={!ready || !carrierReady || !strikeReady}><Icon name="target" size={15}/><span>対艦発艦</span><small>4機</small></button>
      </div>
    </aside>
  );
});

const AirGroup = memo(({ wing }) => (
  <div className={`air-group ${wing.mission ?? ''} ${wing.status}`} style={{ left: `${wing.x}%`, top: `${wing.y}%` }} aria-label={`F-35C航空隊 ${AIR_STATUS_LABELS[wing.status] ?? wing.status}`}>
    <span><Icon name="aircraft" size={18}/><i /><i /></span>
    <b>{wing.mission === 'cap' ? 'CAP' : 'STRIKE'} · {wing.aircraft}</b>
    <small>{AIR_STATUS_LABELS[wing.status] ?? wing.status}</small>
  </div>
));

const SubmarinePanel = memo(({ submarine, sonarPing, sonarCooldown, contact, stats, onDepth, onSilent, onPing }) => {
  const contactText = !contact ? '接触なし' : contact.state === 'confirmed' ? `${contact.ship.code} 識別` : contact.state === 'contact' ? '音紋解析中' : '微弱音響';
  return (
    <aside className={`submarine-panel hud-panel ${sonarPing > 0 ? 'pinging' : ''}`} aria-label="潜水艦・対潜管制">
      <div className="submarine-heading"><span>SUBSURFACE · SS-511</span><small>PING {stats.pings} · TRACK {stats.contacts}</small><i /></div>
      <div className="submarine-readout"><Icon name="sonar" size={21}/><span><strong>{SUB_DEPTH_LABELS[submarine.depthMode] ?? '潜航中'}</strong><small>{submarine.silent ? 'SILENT RUNNING' : '通常航行'} · {submarine.speed.toFixed(0)}kt</small></span><b>{contactText}<small>{contact ? `${contact.distance.toFixed(1)} NM` : '—'}</small></b></div>
      <div className="submarine-actions">
        <button className={submarine.depthMode === 'periscope' ? 'active' : ''} onClick={() => onDepth('periscope')}>潜望鏡</button>
        <button className={submarine.depthMode === 'deep' ? 'active' : ''} onClick={() => onDepth('deep')}>深度潜航</button>
        <button className={submarine.silent ? 'active' : ''} onClick={onSilent}>静粛航行</button>
        <button className={sonarPing > 0 ? 'active ping' : ''} onClick={onPing} disabled={sonarCooldown > 0}><Icon name="sonar" size={13}/>{sonarPing > 0 ? `PING ${sonarPing}` : sonarCooldown > 0 ? `再充填 ${sonarCooldown}` : 'アクティブソナー'}</button>
      </div>
    </aside>
  );
});

const DamageControlPanel = memo(({ ship, resources, cooldown, onDrill, onFire, onPump, onRepair }) => {
  const fire = ship.fire ?? 0;
  const flooding = ship.flooding ?? 0;
  const damaged = fire > 0 || flooding > 0 || ship.hp < ship.maxHp;
  const efficiency = combatEfficiency(ship);
  return (
    <aside className={`damage-control-panel hud-panel ${damaged ? 'casualty' : ''}`} aria-label="損傷統制">
      <div className="damage-heading"><span>DAMAGE CONTROL · {ship.code}</span><b>{cooldown > 0 ? `TEAM ${cooldown}` : damaged ? 'ACTION' : 'READY'}</b><i /></div>
      <div className="damage-readout"><strong>{damaged ? fire > 35 || flooding > 35 ? '重大損傷' : '局所損傷' : '艦内異常なし'}</strong><span>戦闘効率 {Math.round(efficiency * 100)}%</span><small>消火剤 {resources.foam}% · 排水 {resources.pumps}% · 部品 {resources.spares}</small></div>
      <div className="damage-meters"><span>FIRE <i><b style={{ width: `${fire}%` }} /></i><strong>{Math.round(fire)}%</strong></span><span>FLOOD <i><b style={{ width: `${flooding}%` }} /></i><strong>{Math.round(flooding)}%</strong></span></div>
      <div className="damage-actions">
        <button onClick={onDrill} disabled={cooldown > 0 || damaged}>損傷訓練</button>
        <button onClick={onFire} disabled={cooldown > 0 || fire <= 0 || resources.foam < 20}>消火</button>
        <button onClick={onPump} disabled={cooldown > 0 || flooding <= 0 || resources.pumps < 20}>排水</button>
        <button onClick={onRepair} disabled={cooldown > 0 || !damaged || resources.spares <= 0}>応急修理</button>
      </div>
    </aside>
  );
});

const CommandDeck = memo(({ ship, weaponId, onWeapon, onSpeed, onHeading, onFire, cooldown, fireState, formation, onFormation }) => (
  <div className="command-deck hud-panel">
    <section className="speed-control"><label>速力</label><div className="throttle">{REVERSED_SPEED_STEPS.map(s => <button key={s} className={ship.speed >= s && s > 0 ? 'active' : ''} onClick={() => onSpeed(s)}>{s === 0 ? 'STOP' : s}</button>)}</div><output>{ship.speed.toFixed(1)}<small>kt</small></output></section>
    <section className="heading-control"><label>針路</label><div className="heading-dial" style={{ '--dial-heading': `${ship.heading}deg` }}><i /><strong>{String(Math.round(ship.heading)).padStart(3, '0')}°</strong></div><div className="turn-buttons"><button onClick={() => onHeading(-10)} aria-label="左へ10度">−</button><button onClick={() => onHeading(10)} aria-label="右へ10度">＋</button></div></section>
    <section className="formation-control"><label>隊形</label><button className={formation === 'line' ? 'selected' : ''} onClick={() => onFormation('line')}><Icon name="line" size={18}/><span>単縦陣</span></button><button className={formation === 'ring' ? 'selected' : ''} onClick={() => onFormation('ring')}><Icon name="ring" size={18}/><span>輪形陣</span></button></section>
    <section className="weapons"><label>兵装</label><div>{ship.weapons.map(w => <button key={w.id} className={weaponId === w.id ? 'selected' : ''} onClick={() => onWeapon(w.id)}><Icon name="target" size={20}/><span>{w.name}</span><small>{w.ammo}</small></button>)}</div></section>
    <button className="fire-button" onClick={onFire} disabled={cooldown > 0 || ship.hp <= 0 || !fireState.ready}><Icon name="crosshair" size={30}/><strong>{cooldown > 0 ? `再装填 ${cooldown}` : fireState.ready ? '発射' : fireState.reason}</strong><span className="fire-meta">命中 {Math.round(fireState.chance * 100)}%</span></button>
  </div>
));

const TutorialOverlay = memo(({ stepIndex, onStep, onClose }) => {
  const step = TUTORIAL_STEPS[stepIndex];
  const last = stepIndex === TUTORIAL_STEPS.length - 1;
  return (
    <div className="tutorial-overlay">
      <section className="tutorial-shell hud-panel" role="dialog" aria-modal="true" aria-label="戦術訓練ガイド">
        <header><div><span>TACTICAL TRAINING PROGRAM</span><strong>PACIFIC SHIELD ACADEMY</strong></div><button onClick={onClose} aria-label="操作ガイドを閉じる">×</button></header>
        <div className="tutorial-progress" aria-label={`訓練進行 ${stepIndex + 1}/${TUTORIAL_STEPS.length}`}>{TUTORIAL_STEPS.map((item, index) => <button key={item.id} className={index === stepIndex ? 'active' : index < stepIndex ? 'complete' : ''} onClick={() => onStep(index)} aria-label={`訓練ステップ${index + 1} ${item.title}`}><span>{index < stepIndex ? '✓' : index + 1}</span><i /></button>)}</div>
        <article>
          <div className="tutorial-icon"><Icon name={step.icon} size={34}/><span>{String(stepIndex + 1).padStart(2, '0')}</span></div>
          <div className="tutorial-copy"><span>{step.eyebrow}</span><h2>{step.title}</h2><p>{step.body}</p><aside><Icon name="target" size={13}/>{step.tip}</aside></div>
          <div className="tutorial-controls">{step.controls.map(([key, action]) => <span key={key}><kbd>{key}</kbd><small>{action}</small></span>)}</div>
        </article>
        <footer><button onClick={() => onStep(stepIndex - 1)} disabled={stepIndex === 0}>戻る</button><span>{stepIndex + 1} / {TUTORIAL_STEPS.length}</span><button className="tutorial-next" onClick={() => last ? onClose() : onStep(stepIndex + 1)}>{last ? '訓練完了' : '次へ'}</button></footer>
      </section>
    </div>
  );
});

const CampaignRoute = memo(({ profile, activeId, onSelect }) => (
  <section className="campaign-route" aria-label="北太平洋キャンペーン">
    <header><div><span>NORTH PACIFIC CAMPAIGN</span><strong>北太平洋戦役</strong></div><small>{profile.campaign.completed.length}/{CAMPAIGN_OPERATIONS.length} 作戦完遂</small></header>
    <div className="campaign-track">
      {CAMPAIGN_OPERATIONS.map((operation, index) => {
        const completed = profile.campaign.completed.includes(operation.id);
        const unlocked = index === 0 || profile.campaign.completed.includes(CAMPAIGN_OPERATIONS[index - 1].id);
        const stars = profile.campaign.stars[operation.id] ?? 0;
        return <button key={operation.id} className={`${activeId === operation.id ? 'selected' : ''} ${completed ? 'completed' : ''}`} onClick={() => onSelect(operation.id)} disabled={!unlocked} aria-label={unlocked ? `${operation.name}を選択` : `${operation.name} ロック中`}><span>{operation.code}</span><b>{completed ? '✓' : unlocked ? index + 1 : '×'}</b><strong>{operation.name}</strong><small>{operation.callSign}</small><em>{completed ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : unlocked ? `BONUS ×${operation.bonus.toFixed(2)}` : 'LOCKED'}</em></button>;
      })}
    </div>
    {activeId ? <p>{CAMPAIGN_OPERATIONS.find(operation => operation.id === activeId)?.detail}</p> : <p>作戦を順番に完遂すると次の作戦が解放されます。評価に応じて最大3個の星を獲得します。</p>}
  </section>
));

const CareerPanel = memo(({ profile, onUpgrade }) => {
  const rank = rankForXp(profile.xp);
  const rankStart = rank.name === 'ADMIRAL' ? 2500 : rank.name === 'CAPTAIN' ? 1400 : rank.name === 'COMMANDER' ? 700 : rank.name === 'LIEUTENANT' ? 300 : 0;
  const rankProgress = rank.next ? Math.min(100, (profile.xp - rankStart) / (rank.next - rankStart) * 100) : 100;
  return (
    <section className="career-panel" aria-label="司令官戦績と艦隊強化">
      <div className="career-record">
        <div className="rank-badge"><span>COMMAND RANK</span><strong>{rank.name}</strong><small>{rank.label} · {profile.xp} XP</small><i><b style={{ width: `${rankProgress}%` }} /></i></div>
        <div className="career-stats"><span>任務<b>{profile.missions}</b></span><span>勝利<b>{profile.victories}</b></span><span>最高得点<b>{profile.bestScore}</b></span><span>補給ポイント<b>{profile.credits}</b></span></div>
        <div className="medal-rack" aria-label={`獲得勲章 ${profile.medals.length}個`}>
          {Object.values(MEDALS).map(medal => <span key={medal.id} className={profile.medals.includes(medal.id) ? 'earned' : 'locked'} title={`${medal.name}: ${medal.detail}`}><b>{medal.mark}</b><small>{medal.name}</small></span>)}
        </div>
      </div>
      <div className="upgrade-bay">
        <header><span>FLEET UPGRADES</span><small>補給ポイントを恒久強化に使用 · 最大Lv 3</small></header>
        <div>
          {Object.values(UPGRADE_TRACKS).map(track => {
            const level = profile.upgrades[track.id];
            const cost = upgradeCost(level);
            return <button key={track.id} onClick={() => onUpgrade(track.id)} disabled={cost === null || profile.credits < cost} aria-label={`${track.name}を強化`}><b>{track.mark}</b><span><strong>{track.name}</strong><small>{track.detail}</small></span><em>Lv {level}</em><i>{cost === null ? 'MAX' : `${cost} PT`}</i></button>;
          })}
        </div>
      </div>
    </section>
  );
});

const CloudSyncPanel = memo(({ configured, session, busy, message, lastSyncedAt, onSignIn, onSignOut, onUpload, onDownload }) => {
  const [email, setEmail] = useState('');
  const submitEmail = event => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (normalizedEmail) onSignIn(normalizedEmail);
  };
  return (
    <section className={`cloud-sync-panel ${session ? 'connected' : ''}`} aria-label="クラウド同期">
      <header><span>CLOUD SYNC</span><i/><b>{!configured ? 'SETUP REQUIRED' : session ? 'CONNECTED' : 'SIGNED OUT'}</b></header>
      {!configured ? <div className="cloud-unconfigured"><Icon name="save" size={20}/><span><strong>クラウド接続情報が未設定です</strong><small>SupabaseのURLと公開キーを設定すると、端末間で戦績と戦闘保存を同期できます。</small></span></div> : session ? <div className="cloud-account">
        <div><strong>{session.user.email}</strong><small>{lastSyncedAt ? `最終同期 ${new Date(lastSyncedAt).toLocaleString('ja-JP')}` : '同期データはまだありません'}</small></div>
        <div className="cloud-actions"><button onClick={() => onUpload()} disabled={busy}><Icon name="save" size={15}/>クラウドへ保存</button><button onClick={() => onDownload()} disabled={busy}><Icon name="restart" size={15}/>クラウドから復元</button><button className="cloud-signout" onClick={() => onSignOut()} disabled={busy}>ログアウト</button></div>
      </div> : <form className="cloud-signin" onSubmit={submitEmail}>
        <div><strong>メールでサインイン</strong><small>Magic Linkを送信します。パスワードは不要です。</small></div>
        <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="commander@example.com" aria-label="クラウド同期用メールアドレス" required disabled={busy}/>
        <button type="submit" disabled={busy || !email.trim()}>{busy ? '送信中…' : 'リンクを送信'}</button>
      </form>}
      {message ? <p className="cloud-message" role="status">{message}</p> : null}
    </section>
  );
});

const ScenarioBriefing = memo(({ scenarioId, difficultyId, activeCampaignId, profile, savedBattle, cloud, onScenario, onDifficulty, onCampaign, onUpgrade, onTutorial, onStart, onResume }) => {
  const scenario = SCENARIOS[scenarioId];
  const difficulty = DIFFICULTIES[difficultyId];
  const campaignOperation = CAMPAIGN_OPERATIONS.find(operation => operation.id === activeCampaignId);
  return (
    <div className="briefing-overlay">
      <section className="briefing-shell hud-panel" role="dialog" aria-modal="true" aria-label="作戦ブリーフィング">
        <header className="briefing-header">
          <div><span>JOINT OPERATIONS COMMAND</span><strong>PACIFIC SHIELD</strong></div>
          <b>OPERATION BRIEFING</b>
        </header>
        <div className="briefing-intro"><span>作戦を選択</span><p>実在する艦艇で構成されたBLUE CELLを指揮し、指定された任務目標を達成してください。</p></div>
        {savedBattle ? <section className="resume-mission" aria-label="保存した戦闘">
          <div><span>SAVED TACTICAL STATE</span><strong>{SCENARIOS[savedBattle.payload.scenarioId]?.name ?? '保存作戦'}</strong><small>戦術時間 {formatMissionTime(savedBattle.payload.clock ?? 0)} · 得点 {savedBattle.payload.score ?? 0} · {new Date(savedBattle.savedAt).toLocaleString('ja-JP')}</small></div>
          <button className="resume-button" onClick={onResume}><Icon name="play" size={19}/><span>戦闘を再開</span><small>一時停止状態で復元</small></button>
        </section> : null}
        <CloudSyncPanel {...cloud} />
        <div className="scenario-grid">
          {Object.values(SCENARIOS).map(item => (
            <button key={item.id} className={`scenario-card ${scenarioId === item.id ? 'selected' : ''}`} onClick={() => onScenario(item.id)} aria-label={`${item.name}を選択`}>
              <span>{item.code}</span><strong>{item.name}</strong><small>{item.description}</small><b>得点 ×{item.scoreMultiplier.toFixed(2)} · 完遂 {profile.completed[item.id] ?? 0}</b>
            </button>
          ))}
        </div>
        <CampaignRoute profile={profile} activeId={activeCampaignId} onSelect={onCampaign} />
        <div className="difficulty-block">
          <span>難易度 {campaignOperation ? '· キャンペーン指定' : ''}</span>
          <div className="difficulty-selector">
            {Object.values(DIFFICULTIES).map(item => (
              <button key={item.id} className={difficultyId === item.id ? 'selected' : ''} onClick={() => onDifficulty(item.id)} disabled={Boolean(campaignOperation)} aria-label={`${item.label}を選択`}>
                <strong>{item.name}</strong><span>{item.label}</span><small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>
        <CareerPanel profile={profile} onUpgrade={onUpgrade} />
        <footer className="briefing-footer">
          <div><span>{campaignOperation ? `${campaignOperation.code} · ${campaignOperation.callSign}` : '選択中'}</span><strong>{campaignOperation ? campaignOperation.name : scenario.name} · {difficulty.label}</strong><small>最終得点倍率 ×{(scenario.scoreMultiplier * difficulty.scoreMultiplier * (campaignOperation?.bonus ?? 1)).toFixed(2)}</small></div>
          <div className="briefing-actions"><button className="guide-start-button" onClick={onTutorial}><Icon name="target" size={16}/><span>操作ガイド</span></button><button className="start-button" onClick={onStart}><Icon name="play" size={20}/>作戦開始</button></div>
        </footer>
      </section>
    </div>
  );
});

const initialShips = () => SHIPS.map(s => ({ ...s, weapons: s.weapons?.map(w => ({ ...w })) ?? [], ...(s.side === 'blue' ? { fire: 0, flooding: 0 } : { aiMode: 'patrol', aiTargetId: 'ford', underFire: 0 }) }));

export default function App() {
  const [scenarioId, setScenarioId] = useState('pacific');
  const [difficultyId, setDifficultyId] = useState('commander');
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [profile, setProfile] = useState(loadProfile);
  const [lastRewards, setLastRewards] = useState(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [ships, setShips] = useState(initialShips);
  const [selectedId, setSelectedId] = useState('burke');
  const [targetId, setTargetId] = useState('daring');
  const [weaponId, setWeaponId] = useState('sm2');
  const [paused, setPaused] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [event, setEvent] = useState('戦術データリンク接続。海面クリックで艦隊移動。');
  const [shot, setShot] = useState(null);
  const [clock, setClock] = useState(0);
  const [score, setScore] = useState(0);
  const [combatStats, setCombatStats] = useState({ fired: 0, hits: 0, kills: 0 });
  const [formation, setFormation] = useState('line');
  const [waypoint, setWaypoint] = useState(null);
  const [incomingThreat, setIncomingThreat] = useState(null);
  const [defense, setDefense] = useState(() => startingDefense(profile.upgrades.defense));
  const [defenseStats, setDefenseStats] = useState({ intercepts: 0, evades: 0, hits: 0 });
  const [defenseEffect, setDefenseEffect] = useState(null);
  const [airWing, setAirWing] = useState(initialAirWing);
  const [airStats, setAirStats] = useState({ sorties: 0, hits: 0, cap: 0 });
  const [sonarPing, setSonarPing] = useState(0);
  const [sonarCooldown, setSonarCooldown] = useState(0);
  const [aswStats, setAswStats] = useState({ pings: 0, contacts: 0 });
  const [damageControl, setDamageControl] = useState(() => startingDamageControl(profile.upgrades.damage));
  const [dcCooldown, setDcCooldown] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(loadAudioPreference);
  const [savedBattle, setSavedBattle] = useState(loadSavedBattle);
  const [cloudSession, setCloudSession] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudLastSyncedAt, setCloudLastSyncedAt] = useState(null);
  const [audioEngine] = useState(createAudioEngine);
  const resolvedThreatsRef = useRef(new Set());
  const resolvedSortiesRef = useRef(new Set());
  const missionRecordedRef = useRef(false);
  const tutorialWasPausedRef = useRef(false);
  const shipsRef = useRef(ships);
  shipsRef.current = ships;

  const blueShips = useMemo(() => ships.filter(s => s.side === 'blue'), [ships]);
  const selected = useMemo(() => ships.find(s => s.id === selectedId) ?? blueShips[0], [ships, selectedId, blueShips]);
  const aliveEnemies = useMemo(() => ships.filter(s => s.side === 'orange' && s.hp > 0), [ships]);
  const contactStates = useMemo(() => buildContactStates(aliveEnemies, blueShips, sonarPing), [aliveEnemies, blueShips, sonarPing]);
  const confirmedEnemies = useMemo(() => aliveEnemies.filter(enemy => contactStates.get(enemy.id)?.state === 'confirmed'), [aliveEnemies, contactStates]);
  const contactCount = useMemo(() => aliveEnemies.filter(enemy => contactStates.get(enemy.id)?.state === 'contact').length, [aliveEnemies, contactStates]);
  const oryu = useMemo(() => blueShips.find(ship => ship.id === 'oryu'), [blueShips]);
  const submarineContact = useMemo(() => {
    let nearest = null;
    for (const ship of aliveEnemies) {
      if (!ship.submarine) continue;
      const contact = contactStates.get(ship.id);
      if (!contact || (nearest && contact.distance >= nearest.distance)) continue;
      nearest = { ...contact, ship };
    }
    return nearest;
  }, [aliveEnemies, contactStates]);
  const selectedTarget = useMemo(() => {
    const requested = ships.find(ship => ship.id === targetId && ship.hp > 0 && contactStates.get(ship.id)?.state === 'confirmed');
    if (scenarioId === 'asw' && targetId === 'dosan') return requested ?? null;
    return requested ?? confirmedEnemies[0];
  }, [ships, targetId, contactStates, confirmedEnemies, scenarioId]);
  const selectedWeapon = useMemo(() => selected.weapons.find(w => w.id === weaponId) ?? selected.weapons[0], [selected, weaponId]);
  const weaponProfile = useMemo(() => getWeaponProfile(selectedWeapon), [selectedWeapon]);
  const carrier = useMemo(() => blueShips.find(ship => ship.id === 'ford'), [blueShips]);
  const queen = useMemo(() => ships.find(ship => ship.id === 'queen'), [ships]);
  const dosan = useMemo(() => ships.find(ship => ship.id === 'dosan'), [ships]);
  const scenario = SCENARIOS[scenarioId];
  const difficulty = DIFFICULTIES[difficultyId];
  const campaignOperation = CAMPAIGN_OPERATIONS.find(operation => operation.id === activeCampaignId) ?? null;
  const targetDistance = selectedTarget ? nauticalRange(selected, selectedTarget) : 0;
  const targetChance = selectedTarget ? Math.min(.96, hitProbability(targetDistance, weaponProfile) * combatEfficiency(selected) + profile.upgrades.weapons * .025) : 0;
  const intentTargetCode = selectedTarget ? ships.find(ship => ship.id === selectedTarget.aiTargetId)?.code : null;
  const airWeaponSelected = selectedWeapon?.id === 'f35';
  const flightDeckReady = Boolean(carrier?.hp > 0 && (carrier.fire ?? 0) < 55 && (carrier.flooding ?? 0) < 55);
  const fireState = {
    ready: airWeaponSelected
      ? Boolean(selectedTarget && flightDeckReady && airWing.status === 'ready')
      : Boolean(selectedTarget && selectedWeapon?.ammo > 0 && targetDistance <= weaponProfile.range),
    reason: !selectedTarget ? '目標なし' : airWeaponSelected && airWing.status !== 'ready' ? '航空隊行動中' : !flightDeckReady && airWeaponSelected ? '飛行甲板損傷' : selectedWeapon?.ammo <= 0 ? '弾薬なし' : '射程外',
    chance: targetChance,
  };
  const objectiveComplete = scenario.victory === 'carrier'
    ? Boolean(queen && queen.hp <= 0 && carrier && carrier.hp > 0)
    : scenario.victory === 'asw'
      ? Boolean(dosan && dosan.hp <= 0 && oryu && oryu.hp > 0)
      : aliveEnemies.length === 0;
  const status = blueShips.every(s => s.hp <= 0) || (scenario.victory === 'carrier' && carrier?.hp <= 0) || (scenario.victory === 'asw' && oryu?.hp <= 0)
    ? 'defeat' : objectiveComplete ? 'victory' : 'active';
  const progress = scenario.victory === 'carrier' ? Math.max(0, 100 - (queen?.hp ?? 100))
    : scenario.victory === 'asw' ? Math.max(0, 100 - (dosan?.hp ?? 100))
      : (ORANGE_TOTAL - aliveEnemies.length) / ORANGE_TOTAL * 100;
  const accuracy = combatStats.fired ? Math.round(combatStats.hits / combatStats.fired * 100) : 0;
  const evaluatedScore = Math.round(score * scenario.scoreMultiplier * difficulty.scoreMultiplier * (campaignOperation?.bonus ?? 1));
  const grade = evaluatedScore >= 5200 ? 'A' : evaluatedScore >= 3600 ? 'B' : evaluatedScore >= 2200 ? 'C' : 'D';
  const missionProgress = scenario.victory === 'carrier' ? `R08損害 ${Math.round(progress)}% · CVN-78 ${Math.round((carrier?.hp ?? 0) / (carrier?.maxHp ?? 1) * 100)}%`
    : scenario.victory === 'asw' ? `SS-083損害 ${Math.round(progress)}% · SS-511 ${Math.round((oryu?.hp ?? 0) / (oryu?.maxHp ?? 1) * 100)}%`
      : `無力化 ${ORANGE_TOTAL - aliveEnemies.length}/${ORANGE_TOTAL} · 識別 ${confirmedEnemies.length} · 接触 ${contactCount}`;
  const currentThreatPosition = incomingThreat ? threatPosition(incomingThreat) : null;
  const formationSettled = waypoint ? blueShips.every(ship => {
    if (ship.hp <= 0) return true;
    const target = formationTarget(waypoint, formation, BLUE_INDEX.get(ship.id) ?? 0, waypoint.heading);
    return Math.hypot(ship.x - target.x, ship.y - target.y) < .8;
  }) : true;

  useEffect(() => {
    try { window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch { /* private browsing or storage quota */ }
  }, [profile]);

  useEffect(() => {
    if (!cloudSyncConfigured) return undefined;
    let active = true;
    let subscription = null;
    getCloudClient().then(async client => {
      if (!active || !client) return;
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) setCloudMessage(`認証状態を確認できません: ${error.message}`);
      else setCloudSession(data.session);
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (active) setCloudSession(session);
      });
      subscription = listener.subscription;
    });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    audioEngine.setMuted(!audioEnabled);
    try { window.localStorage.setItem(AUDIO_STORAGE_KEY, audioEnabled ? 'enabled' : 'muted'); } catch { /* private browsing or storage quota */ }
  }, [audioEnabled, audioEngine]);

  useEffect(() => {
    if (audioEnabled && !briefingOpen && !paused && status === 'active') audioEngine.startAmbience();
    else audioEngine.stopAmbience();
  }, [audioEnabled, audioEngine, briefingOpen, paused, status]);

  useEffect(() => () => audioEngine.dispose(), [audioEngine]);

  useEffect(() => {
    if (!shot) return undefined;
    audioEngine.play('launch');
    const timer = window.setTimeout(() => audioEngine.play(shot.hit ? 'impact' : 'miss'), 980);
    return () => window.clearTimeout(timer);
  }, [audioEngine, shot?.id]);

  useEffect(() => {
    if (incomingThreat) audioEngine.play('warning');
  }, [audioEngine, incomingThreat?.id]);

  useEffect(() => {
    if (!defenseEffect) return;
    if (defenseEffect.type === 'impact') audioEngine.play('impact');
    else if (defenseEffect.type === 'intercept' || defenseEffect.type === 'air-intercept') audioEngine.play('intercept');
    else audioEngine.play('miss');
  }, [audioEngine, defenseEffect?.id, defenseEffect?.type]);

  useEffect(() => {
    if (airWing.status === 'launching') audioEngine.play('jet');
  }, [audioEngine, airWing.sortieId, airWing.status]);

  useEffect(() => {
    if (!briefingOpen && status !== 'active') audioEngine.play(status === 'victory' ? 'victory' : 'defeat');
  }, [audioEngine, briefingOpen, status]);

  useEffect(() => {
    if (briefingOpen || status === 'active' || missionRecordedRef.current) return;
    missionRecordedRef.current = true;
    const victory = status === 'victory';
    const candidates = [];
    if (victory && profile.victories === 0) candidates.push('first_victory');
    if (victory && combatStats.fired >= 3 && accuracy >= 70) candidates.push('precision');
    if (victory && defenseStats.intercepts >= 2) candidates.push('guardian');
    if (victory && scenarioId === 'asw') candidates.push('sub_hunter');
    if (victory && airStats.hits >= 2) candidates.push('air_ace');
    if (victory && blueShips.every(ship => ship.hp / ship.maxHp >= .7)) candidates.push('flawless');
    if (victory && activeCampaignId === CAMPAIGN_OPERATIONS.at(-1).id) candidates.push('theater');
    const medalsEarned = candidates.filter(id => !profile.medals.includes(id));
    const creditsEarned = victory ? 2 + Math.floor(evaluatedScore / 1800) + (difficultyId === 'admiral' ? 1 : 0) + (campaignOperation ? 2 : 0) : 1;
    const xpEarned = victory ? 140 + Math.round(evaluatedScore / 40) + (difficultyId === 'admiral' ? 80 : difficultyId === 'commander' ? 35 : 0) : 45;
    const earnedStars = grade === 'A' ? 3 : grade === 'B' ? 2 : victory ? 1 : 0;
    setProfile(current => ({
      ...current,
      xp: current.xp + xpEarned,
      credits: current.credits + creditsEarned,
      missions: current.missions + 1,
      victories: current.victories + (victory ? 1 : 0),
      totalScore: current.totalScore + evaluatedScore,
      bestScore: Math.max(current.bestScore, evaluatedScore),
      medals: Array.from(new Set([...current.medals, ...candidates])),
      completed: { ...current.completed, [scenarioId]: (current.completed[scenarioId] ?? 0) + (victory ? 1 : 0) },
      campaign: activeCampaignId && victory ? {
        completed: Array.from(new Set([...current.campaign.completed, activeCampaignId])),
        stars: { ...current.campaign.stars, [activeCampaignId]: Math.max(current.campaign.stars[activeCampaignId] ?? 0, earnedStars) },
      } : current.campaign,
    }));
    setLastRewards({ xp: xpEarned, credits: creditsEarned, medals: medalsEarned, campaign: campaignOperation && victory ? { name: campaignOperation.name, stars: earnedStars } : null });
  }, [briefingOpen, status, profile.victories, profile.medals, combatStats.fired, accuracy, defenseStats.intercepts, scenarioId, airStats.hits, blueShips, evaluatedScore, difficultyId, activeCampaignId, campaignOperation, grade]);

  useEffect(() => {
    if (briefingOpen || paused || status !== 'active') return undefined;
    const timer = window.setInterval(() => {
      setClock(c => c + 1);
      setCooldown(c => Math.max(0, c - 1));
      setSonarPing(c => Math.max(0, c - 1));
      setSonarCooldown(c => Math.max(0, c - 1));
      setDcCooldown(c => Math.max(0, c - 1));
      setShips(current => {
        const activeBlue = current.filter(ship => ship.side === 'blue' && ship.hp > 0);
        return current.map(ship => {
        if (ship.hp <= 0) return ship;
        let activeShip = ship;
        if (ship.side === 'blue') {
          const fire = Math.max(0, Math.min(100, (ship.fire ?? 0) + ((ship.fire ?? 0) > 20 ? .7 : -1.4)));
          const flooding = Math.max(0, Math.min(100, (ship.flooding ?? 0) + ((ship.flooding ?? 0) > 30 ? .35 : -.55)));
          const attrition = Math.round(fire * .17 + flooding * .21);
          const hp = Math.max(0, ship.hp - attrition);
          activeShip = { ...ship, fire, flooding, hp };
          activeShip.speed = Math.min(activeShip.speed, operationalSpeed(activeShip));
        }
        if (activeShip.hp <= 0) return activeShip;
        if (activeShip.side === 'blue' && waypoint) {
          const destination = formationTarget(waypoint, formation, BLUE_INDEX.get(activeShip.id) ?? 0, waypoint.heading);
          const dx = destination.x - activeShip.x;
          const dy = destination.y - activeShip.y;
          const distance = Math.hypot(dx, dy);
          if (distance < .22) return { ...activeShip, x: destination.x, y: destination.y, heading: waypoint.heading };
          const step = Math.min(distance, Math.max(.22, activeShip.speed * .018));
          const heading = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
          return { ...activeShip, x: Math.max(8, Math.min(94, activeShip.x + dx / distance * step)), y: Math.max(10, Math.min(88, activeShip.y + dy / distance * step)), heading };
        }
        if (activeShip.side === 'orange') return enemyTacticalStep(activeShip, activeBlue);
        const rad = (activeShip.heading - 90) * Math.PI / 180;
        return { ...activeShip, x: Math.max(12, Math.min(92, activeShip.x + Math.cos(rad) * activeShip.speed * .0025)), y: Math.max(14, Math.min(86, activeShip.y + Math.sin(rad) * activeShip.speed * .0025)) };
        });
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [briefingOpen, paused, status, waypoint, formation]);

  useEffect(() => {
    if (briefingOpen || paused || status !== 'active' || airWing.status === 'ready' || airWing.status === 'attack' || airWing.status === 'diverted') return;
    setAirWing(current => {
      const currentShips = shipsRef.current;
      const home = currentShips.find(ship => ship.id === 'ford');
      if (!home || home.hp <= 0) return { ...current, status: 'diverted', aircraft: 0, fuel: 0 };
      const nextPhase = current.phase + 1;
      if (current.status === 'launching') {
        return nextPhase >= 2
          ? { ...current, status: current.mission === 'cap' ? 'cap' : 'ingress', phase: 0, fuel: 96 }
          : { ...current, phase: nextPhase, x: home.x + 2.5, y: home.y - 2 };
      }
      if (current.status === 'cap') {
        if (nextPhase >= 20 || current.fuel <= 34) return { ...current, status: 'returning', phase: 0 };
        const angle = nextPhase * .72;
        return { ...current, phase: nextPhase, fuel: Math.max(0, current.fuel - 4), x: home.x + Math.cos(angle) * 8, y: home.y + Math.sin(angle) * 5.5 };
      }
      if (current.status === 'ingress') {
        const target = currentShips.find(ship => ship.id === current.targetId && ship.hp > 0);
        if (!target) return { ...current, status: 'returning', phase: 0 };
        const distance = Math.hypot(target.x - current.x, target.y - current.y);
        const position = moveToward(current, target, .38);
        return distance < 7 || nextPhase >= 5
          ? { ...current, ...position, status: 'attack', phase: 0, fuel: Math.max(0, current.fuel - 9) }
          : { ...current, ...position, phase: nextPhase, fuel: Math.max(0, current.fuel - 9) };
      }
      if (current.status === 'returning') {
        const distance = Math.hypot(home.x - current.x, home.y - current.y);
        const position = moveToward(current, home, .46);
        return distance < 3.2
          ? { ...current, ...position, status: 'rearming', phase: 0, fuel: Math.max(0, current.fuel - 4) }
          : { ...current, ...position, phase: nextPhase, fuel: Math.max(0, current.fuel - 4) };
      }
      if (current.status === 'rearming') {
        return nextPhase >= 4
          ? { ...initialAirWing(), available: current.available }
          : { ...current, phase: nextPhase, x: home.x, y: home.y, fuel: Math.min(100, current.fuel + 18) };
      }
      return current;
    });
  }, [clock, briefingOpen, paused, status, airWing.status]);

  useEffect(() => {
    if (airWing.status !== 'attack' || !airWing.sortieId || resolvedSortiesRef.current.has(airWing.sortieId)) return undefined;
    resolvedSortiesRef.current.add(airWing.sortieId);
    const target = shipsRef.current.find(ship => ship.id === airWing.targetId && ship.hp > 0);
    if (!target) {
      setAirWing(current => ({ ...current, status: 'returning', phase: 0 }));
      return undefined;
    }
    const hitChance = Math.min(.96, .84 + profile.upgrades.weapons * .025);
    const hit = Math.random() <= hitChance;
    const damage = hit ? 34 + Math.floor(Math.random() * 13) : 0;
    const killed = hit && target.hp - damage <= 0;
    setShips(current => current.map(ship => ship.id === target.id ? { ...ship, hp: Math.max(0, ship.hp - damage), underFire: 6, lastAttackerId: 'ford' } : ship));
    setCombatStats(current => ({ fired: current.fired + 1, hits: current.hits + (hit ? 1 : 0), kills: current.kills + (killed ? 1 : 0) }));
    setAirStats(current => ({ ...current, hits: current.hits + (hit ? 1 : 0) }));
    if (hit) setScore(current => current + damage * 12 + (killed ? 600 : 0));
    setShot({ id: airWing.sortieId, from: { x: airWing.x, y: airWing.y }, to: { x: target.x + (hit ? 0 : 2.4), y: target.y + (hit ? 0 : 2.2) }, target: target.id, hit });
    setEvent(hit ? `VFA-147 航空攻撃命中 — ${target.code}に${damage}%有効打${killed ? '・目標無力化' : ''}` : `VFA-147 航空攻撃 — ${target.code}への攻撃は外れ`);
    const timer = window.setTimeout(() => {
      setShot(null);
      setAirWing(current => current.sortieId === airWing.sortieId ? { ...current, status: 'returning', phase: 0 } : current);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [airWing.status, airWing.sortieId, airWing.targetId, airWing.x, airWing.y, profile.upgrades.weapons]);

  useEffect(() => {
    if (briefingOpen || paused || status !== 'active' || clock % scenario.airCadence !== scenario.airOffset || incomingThreat) return;
    const source = aliveEnemies.find(enemy => enemy.id === 'queen' && enemy.hp > 0);
    const targets = blueShips.filter(ship => ship.hp > 0);
    if (!source || !targets.length) return;
    const target = targets.reduce((best, candidate) => blueTargetScore(candidate, source) > blueTargetScore(best, source) ? candidate : best, targets[0]);
    const sourceKnown = contactStates.get(source.id)?.state === 'confirmed';
    setIncomingThreat({
      id: `airraid-${clock}`,
      sourceId: source.id,
      sourceCode: sourceKnown ? source.code : 'AIR CONTACT',
      targetId: target.id,
      targetCode: target.code,
      start: { x: source.x, y: source.y },
      end: { x: target.x, y: target.y },
      eta: Math.max(5, 14 + difficulty.eta),
      maxEta: Math.max(5, 14 + difficulty.eta),
      accuracy: Math.min(.95, .83 * difficulty.accuracy),
      damage: Math.round(640 * difficulty.damage),
      kind: 'airraid',
      aircraft: 6,
      maxAircraft: 6,
      jammed: false,
      decoy: false,
      capEngaged: false,
    });
    setEvent(`敵航空隊発艦 — ${sourceKnown ? source.code : '敵空母'}からF-35B 6機が${target.code}へ接近`);
  }, [clock, briefingOpen, paused, status, incomingThreat, blueShips, aliveEnemies, contactStates, scenario, difficulty]);

  useEffect(() => {
    if (briefingOpen || paused || status !== 'active' || clock === 0 || clock % scenario.missileCadence !== 0 || incomingThreat) return;
    const targets = blueShips.filter(ship => ship.hp > 0);
    if (!targets.length || !aliveEnemies.length) return;
    const surfaceEnemies = aliveEnemies.filter(enemy => !enemy.submarine);
    const strikeCapable = surfaceEnemies.filter(enemy => enemy.aiMode !== 'retreat');
    const sourcePool = strikeCapable.length ? strikeCapable : surfaceEnemies;
    if (!sourcePool.length) return;
    const source = sourcePool[Math.floor(clock / scenario.missileCadence) % sourcePool.length];
    const target = targets.reduce((best, candidate) => blueTargetScore(candidate, source) > blueTargetScore(best, source) ? candidate : best, targets[0]);
    const sourceKnown = contactStates.get(source.id)?.state === 'confirmed';
    const aiAccuracy = source.aiMode === 'attack' ? .84 : source.aiMode === 'flank' ? .81 : source.aiMode === 'retreat' ? .62 : .76;
    setIncomingThreat({
      id: `threat-${clock}`,
      sourceId: source.id,
      sourceCode: sourceKnown ? source.code : 'UNKNOWN',
      targetId: target.id,
      targetCode: target.code,
      start: { x: source.x, y: source.y },
      end: { x: target.x, y: target.y },
      eta: Math.max(4, 7 + difficulty.eta),
      maxEta: Math.max(4, 7 + difficulty.eta),
      accuracy: Math.min(.95, aiAccuracy * difficulty.accuracy),
      damage: Math.round((470 + (clock % 5) * 45) * difficulty.damage),
      kind: 'missile',
      jammed: false,
      decoy: false,
    });
    setEvent(`ミサイル接近警報 — ${AI_LABELS[source.aiMode] ?? '敵機動'}中の${sourceKnown ? source.code : '不明艦'}が${target.code}を攻撃`);
  }, [clock, briefingOpen, paused, status, incomingThreat, blueShips, aliveEnemies, contactStates, scenario, difficulty]);

  useEffect(() => {
    if (briefingOpen || paused || status !== 'active' || clock === 0 || clock % scenario.torpedoCadence !== 0 || incomingThreat) return;
    const source = aliveEnemies.find(enemy => enemy.submarine && enemy.hp > 0 && enemy.aiMode !== 'retreat');
    const targets = blueShips.filter(ship => ship.hp > 0);
    if (!source || !targets.length) return;
    let target = targets[0];
    let targetDistance = nauticalRange(source, target);
    for (const candidate of targets.slice(1)) {
      const distance = nauticalRange(source, candidate);
      if (distance < targetDistance) { target = candidate; targetDistance = distance; }
    }
    if (targetDistance > 42) return;
    const sourceKnown = contactStates.get(source.id)?.state === 'confirmed';
    setIncomingThreat({
      id: `torpedo-${clock}`,
      sourceId: source.id,
      sourceCode: sourceKnown ? source.code : 'SONAR CONTACT',
      targetId: target.id,
      targetCode: target.code,
      start: { x: source.x, y: source.y },
      end: { x: target.x, y: target.y },
      eta: Math.max(5, 14 + difficulty.eta),
      maxEta: Math.max(5, 14 + difficulty.eta),
      accuracy: Math.min(.95, (source.silent ? .76 : .68) * difficulty.accuracy),
      damage: Math.round(720 * difficulty.damage),
      kind: 'torpedo',
      jammed: false,
      decoy: false,
    });
    setEvent(`魚雷接近警報 — ${sourceKnown ? source.code : '未識別潜水艦'}が${target.code}を攻撃`);
  }, [clock, briefingOpen, paused, status, incomingThreat, blueShips, aliveEnemies, contactStates, scenario, difficulty]);

  useEffect(() => {
    if (briefingOpen || paused || !incomingThreat || incomingThreat.eta <= 0) return;
    setIncomingThreat(current => current && current.id === incomingThreat.id ? { ...current, eta: Math.max(0, current.eta - 1) } : current);
  }, [clock, briefingOpen, paused, incomingThreat?.id]);

  useEffect(() => {
    if (!incomingThreat || incomingThreat.kind === 'torpedo' || airWing.status !== 'cap' || incomingThreat.capEngaged) return;
    const isAirRaid = incomingThreat.kind === 'airraid';
    setIncomingThreat(current => current ? {
      ...current,
      capEngaged: true,
      accuracy: Math.max(.1, current.accuracy - (isAirRaid ? .34 : .24)),
      ...(isAirRaid ? { aircraft: Math.max(1, current.aircraft - 3) } : {}),
    } : current);
    setAirStats(current => ({ ...current, cap: current.cap + 1 }));
    setScore(current => current + (isAirRaid ? 360 : 180));
    const position = threatPosition(incomingThreat);
    setDefenseEffect({ id: incomingThreat.id, type: isAirRaid ? 'air-intercept' : 'intercept', x: position.x, y: position.y });
    window.setTimeout(() => setDefenseEffect(null), 1300);
    setEvent(isAirRaid ? `VFA-147 CAPが敵F-35Bと交戦 — 3機を任務離脱、残存${Math.max(1, incomingThreat.aircraft - 3)}機` : `VFA-147 CAPが${incomingThreat.targetCode}への敵ミサイルを妨害 — 命中率低下`);
  }, [incomingThreat?.id, incomingThreat?.capEngaged, incomingThreat?.targetCode, airWing.status]);

  useEffect(() => {
    if (!incomingThreat || incomingThreat.eta > 0 || resolvedThreatsRef.current.has(incomingThreat.id)) return;
    resolvedThreatsRef.current.add(incomingThreat.id);
    const target = ships.find(ship => ship.id === incomingThreat.targetId && ship.hp > 0);
    const hit = Boolean(target) && Math.random() < incomingThreat.accuracy;
    if (hit) {
      setShips(current => current.map(ship => ship.id === incomingThreat.targetId ? {
        ...ship,
        hp: Math.max(0, ship.hp - incomingThreat.damage),
        fire: Math.min(100, (ship.fire ?? 0) + (incomingThreat.kind === 'torpedo' ? 14 : 36)),
        flooding: Math.min(100, (ship.flooding ?? 0) + (incomingThreat.kind === 'torpedo' ? 52 : 18)),
      } : ship));
      setDefenseStats(current => ({ ...current, hits: current.hits + 1 }));
      setEvent(`${incomingThreat.targetCode} ${incomingThreat.kind === 'torpedo' ? '魚雷被雷' : incomingThreat.kind === 'airraid' ? '航空攻撃被弾' : '被弾'} — 模擬損害 ${incomingThreat.damage}`);
    } else {
      setDefenseStats(current => ({ ...current, evades: current.evades + 1 }));
      setScore(current => current + 180);
      setEvent(`${incomingThreat.targetCode}への${incomingThreat.kind === 'torpedo' ? '魚雷' : incomingThreat.kind === 'airraid' ? '航空攻撃' : 'ミサイル'}を回避`);
    }
    setDefenseEffect({ id: incomingThreat.id, type: hit ? 'impact' : 'evade', x: incomingThreat.end.x, y: incomingThreat.end.y });
    window.setTimeout(() => setDefenseEffect(null), 1300);
    setIncomingThreat(null);
  }, [incomingThreat, ships]);

  const selectShip = useCallback((id) => {
    const ship = ships.find(s => s.id === id);
    if (!ship || ship.hp <= 0) return;
    setSelectedId(id);
    setWeaponId(ship.weapons[0]?.id ?? '');
    setEvent(`${ship.code} ${ship.name} を戦術管制下に設定`);
  }, [ships]);

  const selectTarget = useCallback((id) => {
    const target = ships.find(s => s.id === id);
    if (!target) return;
    if (contactStates.get(id)?.state !== 'confirmed') {
      setEvent(target.submarine ? '未確認音響を追跡中 — アクティブソナーで音紋を識別してください' : '未確認目標を追跡中 — 艦隊を接近させて識別してください');
      return;
    }
    setTargetId(id);
    setEvent(`${target.code} ${target.name} を攻撃目標に指定`);
  }, [ships, contactStates]);

  const commandFormation = useCallback((mode) => {
    const activeFleet = blueShips.filter(ship => ship.hp > 0);
    if (!activeFleet.length) return;
    const center = activeFleet.reduce((total, ship) => ({ x: total.x + ship.x / activeFleet.length, y: total.y + ship.y / activeFleet.length }), { x: 0, y: 0 });
    setFormation(mode);
    setWaypoint(current => current ? { ...current } : { ...center, heading: selected.heading });
    setEvent(`${mode === 'line' ? '単縦陣' : '輪形陣'}への隊形変更を指示`);
  }, [blueShips, selected.heading]);

  const commandWaypoint = useCallback((event) => {
    if (briefingOpen || paused || status !== 'active') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(16, Math.min(84, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(18, Math.min(82, (event.clientY - rect.top) / rect.height * 100));
    const activeFleet = blueShips.filter(ship => ship.hp > 0);
    if (!activeFleet.length) return;
    const center = activeFleet.reduce((total, ship) => ({ x: total.x + ship.x / activeFleet.length, y: total.y + ship.y / activeFleet.length }), { x: 0, y: 0 });
    const heading = (Math.atan2(y - center.y, x - center.x) * 180 / Math.PI + 90 + 360) % 360;
    setWaypoint({ x, y, heading });
    setEvent(`艦隊移動命令 — 針路 ${String(Math.round(heading)).padStart(3, '0')}°、${formation === 'line' ? '単縦陣' : '輪形陣'}`);
  }, [briefingOpen, paused, status, blueShips, formation]);

  const updateSelected = useCallback((fn) => setShips(current => current.map(s => s.id === selectedId ? fn(s) : s)), [selectedId]);
  const changeSpeed = useCallback((speed) => { const ordered = Math.min(speed, operationalSpeed(selected)); updateSelected(s => ({ ...s, speed: ordered })); setEvent(`${selected.code} 速力 ${speed === 0 ? '停止' : `${ordered.toFixed(1)}ノット`}`); }, [selected, updateSelected]);
  const changeHeading = useCallback((delta) => { updateSelected(s => ({ ...s, heading: (s.heading + delta + 360) % 360 })); }, [updateSelected]);

  const changeSubmarineDepth = useCallback((depthMode) => {
    setShips(current => current.map(ship => ship.id === 'oryu' ? { ...ship, depthMode, speed: Math.min(ship.speed, depthMode === 'deep' ? 12 : 16) } : ship));
    setEvent(`SS-511 ${SUB_DEPTH_LABELS[depthMode]}へ移行 — ${depthMode === 'deep' ? '被探知率低下' : 'センサー感度上昇'}`);
  }, []);

  const toggleSilentRunning = useCallback(() => {
    setShips(current => current.map(ship => ship.id === 'oryu' ? { ...ship, silent: !ship.silent, speed: !ship.silent ? Math.min(ship.speed, 8) : ship.speed } : ship));
    setEvent(`SS-511 静粛航行を切替`);
  }, []);

  const activateSonar = useCallback(() => {
    if (!oryu || oryu.hp <= 0 || sonarCooldown > 0) return;
    let nearestSub = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of aliveEnemies) {
      if (!enemy.submarine) continue;
      const distance = nauticalRange(oryu, enemy);
      if (distance < nearestDistance) { nearestSub = enemy; nearestDistance = distance; }
    }
    setSonarPing(12);
    setSonarCooldown(18);
    setShips(current => current.map(ship => ship.id === 'oryu' ? { ...ship, silent: false } : ship));
    setAswStats(current => ({ pings: current.pings + 1, contacts: current.contacts + (nearestSub && nearestDistance <= 72 ? 1 : 0) }));
    setSelectedId('oryu');
    setWeaponId('type89');
    audioEngine.play('sonar');
    if (nearestSub && nearestDistance <= 72) {
      setTargetId(nearestSub.id);
      setEvent(`アクティブソナー送信 — ${nearestSub.code}の音紋を捕捉、魚雷攻撃諸元を生成`);
    } else {
      setEvent('アクティブソナー送信 — 有効圏内に潜水艦反応なし');
    }
  }, [oryu, sonarCooldown, aliveEnemies, audioEngine]);

  const startDamageDrill = useCallback(() => {
    if (dcCooldown > 0 || selected.hp <= 0 || (selected.fire ?? 0) > 0 || (selected.flooding ?? 0) > 0 || selected.hp < selected.maxHp) return;
    updateSelected(ship => ({ ...ship, hp: Math.max(1, ship.hp - Math.round(ship.maxHp * .035)), fire: 48, flooding: 32 }));
    setEvent(`${selected.code} 損傷統制訓練開始 — 機関区火災・二区画浸水を付与`);
    audioEngine.play('warning');
  }, [dcCooldown, selected, updateSelected, audioEngine]);

  const extinguishFire = useCallback(() => {
    if (dcCooldown > 0 || (selected.fire ?? 0) <= 0 || damageControl.foam < 20) return;
    setDamageControl(current => ({ ...current, foam: Math.max(0, current.foam - 20) }));
    updateSelected(ship => ({ ...ship, fire: Math.max(0, (ship.fire ?? 0) - 44 * (1 + profile.upgrades.damage * .15)) }));
    setDcCooldown(2);
    setEvent(`${selected.code} 消火班投入 — 火災を局限`);
    audioEngine.play('repair');
  }, [dcCooldown, selected, damageControl.foam, updateSelected, profile.upgrades.damage, audioEngine]);

  const dewaterShip = useCallback(() => {
    if (dcCooldown > 0 || (selected.flooding ?? 0) <= 0 || damageControl.pumps < 20) return;
    setDamageControl(current => ({ ...current, pumps: Math.max(0, current.pumps - 20) }));
    updateSelected(ship => ({ ...ship, flooding: Math.max(0, (ship.flooding ?? 0) - 36 * (1 + profile.upgrades.damage * .15)) }));
    setDcCooldown(2);
    setEvent(`${selected.code} 排水ポンプ始動 — 浸水区画を安定化`);
    audioEngine.play('repair');
  }, [dcCooldown, selected, damageControl.pumps, updateSelected, profile.upgrades.damage, audioEngine]);

  const emergencyRepair = useCallback(() => {
    if (dcCooldown > 0 || damageControl.spares <= 0 || ((selected.fire ?? 0) <= 0 && (selected.flooding ?? 0) <= 0 && selected.hp >= selected.maxHp)) return;
    setDamageControl(current => ({ ...current, spares: Math.max(0, current.spares - 1) }));
    updateSelected(ship => ({ ...ship, hp: Math.min(ship.maxHp, ship.hp + Math.round(ship.maxHp * (.085 + profile.upgrades.damage * .018))), fire: Math.max(0, (ship.fire ?? 0) - 12), flooding: Math.max(0, (ship.flooding ?? 0) - 10) }));
    setDcCooldown(3);
    setEvent(`${selected.code} 応急修理完了 — 推進・センサー系統を復旧`);
    audioEngine.play('repair');
  }, [dcCooldown, selected, damageControl.spares, updateSelected, profile.upgrades.damage, audioEngine]);

  const launchAirMission = useCallback((mission) => {
    const home = ships.find(ship => ship.id === 'ford');
    if (!home || home.hp <= 0 || (home.fire ?? 0) >= 55 || (home.flooding ?? 0) >= 55) { setEvent('発艦不能 — CVN-78の飛行甲板が使用できません'); return; }
    if (airWing.status !== 'ready') { setEvent(`発艦不能 — 航空隊は${AIR_STATUS_LABELS[airWing.status] ?? '任務中'}です`); return; }
    const target = mission === 'strike' ? selectedTarget : null;
    if (mission === 'strike' && !target) { setEvent('発艦不能 — 識別済みの攻撃目標がありません'); return; }
    const sortieId = `sortie-${Date.now()}`;
    setAirWing({ status: 'launching', mission, aircraft: mission === 'cap' ? 2 : 4, available: 24, fuel: 100, phase: 0, x: home.x, y: home.y, targetId: target?.id ?? null, sortieId });
    setAirStats(current => ({ ...current, sorties: current.sorties + 1 }));
    setEvent(mission === 'cap' ? 'VFA-147 F-35C 2機がCAP任務で発艦' : `VFA-147 F-35C 4機が${target.code}への対艦攻撃で発艦`);
  }, [ships, airWing.status, selectedTarget]);

  const interceptThreat = useCallback(() => {
    if (!incomingThreat || incomingThreat.kind === 'torpedo' || defense.interceptors <= 0) return;
    setDefense(current => ({ ...current, interceptors: Math.max(0, current.interceptors - 1) }));
    if (incomingThreat.kind === 'airraid') {
      const remaining = Math.max(0, incomingThreat.aircraft - 2);
      const position = threatPosition(incomingThreat);
      setDefenseStats(current => ({ ...current, intercepts: current.intercepts + 1 }));
      setScore(current => current + 280);
      setDefenseEffect({ id: incomingThreat.id, type: 'air-intercept', x: position.x, y: position.y });
      window.setTimeout(() => setDefenseEffect(null), 1300);
      if (remaining <= 0) {
        resolvedThreatsRef.current.add(incomingThreat.id);
        setIncomingThreat(null);
        setEvent(`艦対空迎撃成功 — 敵F-35B編隊を全機任務離脱`);
      } else {
        setIncomingThreat(current => current ? { ...current, aircraft: remaining, accuracy: Math.max(.12, current.accuracy - .24) } : current);
        setEvent(`艦対空迎撃 — 敵F-35B 2機を任務離脱、残存${remaining}機`);
      }
      return;
    }
    const success = Math.random() < .82;
    if (!success) {
      setEvent(`迎撃失敗 — ${incomingThreat.targetCode}への脅威は継続`);
      return;
    }
    resolvedThreatsRef.current.add(incomingThreat.id);
    const position = threatPosition(incomingThreat);
    setDefenseStats(current => ({ ...current, intercepts: current.intercepts + 1 }));
    setScore(current => current + 260);
    setDefenseEffect({ id: incomingThreat.id, type: 'intercept', x: position.x, y: position.y });
    window.setTimeout(() => setDefenseEffect(null), 1300);
    setIncomingThreat(null);
    setEvent(`迎撃成功 — ${incomingThreat.targetCode}へのミサイルを破壊`);
  }, [incomingThreat, defense.interceptors]);

  const jamThreat = useCallback(() => {
    if (!incomingThreat || incomingThreat.kind === 'torpedo' || incomingThreat.jammed || defense.ew < 25) return;
    setDefense(current => ({ ...current, ew: Math.max(0, current.ew - 25) }));
    setIncomingThreat(current => current ? { ...current, jammed: true, accuracy: Math.max(.12, current.accuracy - .34) } : current);
    setEvent(incomingThreat.kind === 'airraid' ? '電子戦妨害を開始 — 敵F-35Bの照準・データリンク精度を低下' : '電子戦妨害を開始 — 敵誘導精度を低下');
    audioEngine.play('ew');
  }, [incomingThreat, defense.ew, audioEngine]);

  const deployDecoy = useCallback(() => {
    if (!incomingThreat || incomingThreat.decoy || defense.decoys <= 0) return;
    setDefense(current => ({ ...current, decoys: Math.max(0, current.decoys - 1) }));
    setIncomingThreat(current => current ? { ...current, decoy: true, accuracy: Math.max(.08, current.accuracy - .3) } : current);
    setEvent(incomingThreat.kind === 'torpedo' ? `音響囮を展開 — ${incomingThreat.targetCode}から魚雷を誘引` : incomingThreat.kind === 'airraid' ? `回避支援を開始 — ${incomingThreat.targetCode}が煙幕・急旋回を実施` : `デコイ展開 — ${incomingThreat.targetCode}から誘導を逸らします`);
    audioEngine.play('decoy');
  }, [incomingThreat, defense.decoys, audioEngine]);

  const fire = useCallback(() => {
    if (briefingOpen || paused || cooldown > 0 || status !== 'active' || selected.hp <= 0) return;
    const weapon = selectedWeapon;
    const target = selectedTarget;
    if (!weapon || !target || weapon.ammo <= 0) { setEvent('発射不能 — 弾薬または目標がありません'); return; }
    if (weapon.id === 'f35') { launchAirMission('strike'); setCooldown(3); return; }
    if (targetDistance > weaponProfile.range) { setEvent(`発射不能 — ${target.code}は${weapon.name}の射程外`); return; }
    const hit = Math.random() <= targetChance;
    const damage = hit ? weapon.damage + Math.floor(Math.random() * 16) : 0;
    const killed = hit && target.hp - damage <= 0;
    setShips(current => current.map(s => {
      if (s.id === selected.id) return { ...s, weapons: s.weapons.map(w => w.id === weapon.id ? { ...w, ammo: Math.max(0, w.ammo - 1) } : w) };
      if (s.id === target.id) return { ...s, hp: Math.max(0, s.hp - damage), underFire: 5, lastAttackerId: selected.id };
      return s;
    }));
    setCombatStats(current => ({ fired: current.fired + 1, hits: current.hits + (hit ? 1 : 0), kills: current.kills + (killed ? 1 : 0) }));
    if (hit) setScore(current => current + damage * 10 + (killed ? 500 : 0));
    setShot({ id: Date.now(), from: { x: selected.x, y: selected.y }, to: { x: target.x + (hit ? 0 : 2.2), y: target.y + (hit ? 0 : 2.6) }, target: target.id, hit });
    window.setTimeout(() => setShot(null), 2000);
    setCooldown(3);
    setEvent(hit ? `${selected.code} ${weapon.name}命中 — ${target.code}に${damage}%有効打${killed ? '・目標無力化' : ''}` : `${selected.code} ${weapon.name}発射 — ${target.code}への攻撃は外れ`);
  }, [briefingOpen, paused, cooldown, status, selected, selectedWeapon, selectedTarget, targetDistance, weaponProfile.range, targetChance, launchAirMission]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.target instanceof HTMLButtonElement && e.key === ' ') return;
      if (briefingOpen || tutorialOpen) return;
      if (e.key.toLowerCase() === 'p') setPaused(p => !p);
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') changeHeading(-10);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') changeHeading(10);
      if (e.key.toLowerCase() === 'i') interceptThreat();
      if (e.key.toLowerCase() === 'e') jamThreat();
      if (e.key.toLowerCase() === 'c') deployDecoy();
      if (e.key.toLowerCase() === 'l') launchAirMission('cap');
      if (e.key.toLowerCase() === 'k') launchAirMission('strike');
      if (e.key.toLowerCase() === 'q') activateSonar();
      if (e.key.toLowerCase() === 'z') changeSubmarineDepth(oryu?.depthMode === 'deep' ? 'periscope' : 'deep');
      if (e.key.toLowerCase() === 'x') toggleSilentRunning();
      if (e.key === ' ') { e.preventDefault(); fire(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [briefingOpen, tutorialOpen, changeHeading, fire, interceptThreat, jamThreat, deployDecoy, launchAirMission, activateSonar, changeSubmarineDepth, toggleSilentRunning, oryu?.depthMode]);

  const openTutorial = useCallback(() => {
    tutorialWasPausedRef.current = paused;
    setTutorialStep(0);
    setTutorialOpen(true);
    setPaused(true);
  }, [paused]);

  const closeTutorial = useCallback(() => {
    setTutorialOpen(false);
    setPaused(tutorialWasPausedRef.current);
    setProfile(current => current.tutorialSeen ? current : { ...current, tutorialSeen: true });
  }, []);

  const goTutorialStep = useCallback((index) => setTutorialStep(Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, index))), []);

  const selectFreeScenario = useCallback((id) => {
    if (!SCENARIOS[id]) return;
    setActiveCampaignId(null);
    setScenarioId(id);
  }, []);

  const selectCampaignOperation = useCallback((id) => {
    const index = CAMPAIGN_OPERATIONS.findIndex(operation => operation.id === id);
    if (index < 0) return;
    const unlocked = index === 0 || profile.campaign.completed.includes(CAMPAIGN_OPERATIONS[index - 1].id);
    if (!unlocked) return;
    const operation = CAMPAIGN_OPERATIONS[index];
    setActiveCampaignId(operation.id);
    setScenarioId(operation.scenarioId);
    setDifficultyId(operation.difficultyId);
  }, [profile.campaign.completed]);

  const upgradeFleet = useCallback((trackId) => {
    if (!UPGRADE_TRACKS[trackId]) return;
    setProfile(current => {
      const level = current.upgrades[trackId];
      const cost = upgradeCost(level);
      if (cost === null || current.credits < cost) return current;
      return { ...current, credits: current.credits - cost, upgrades: { ...current.upgrades, [trackId]: level + 1 } };
    });
  }, []);

  const requestCloudSignIn = useCallback(async email => {
    setCloudBusy(true);
    setCloudMessage('');
    try {
      await sendMagicLink(email);
      setCloudMessage('認証メールを送信しました。メール内のリンクを開いてください。');
    } catch (error) {
      setCloudMessage(`認証メールを送信できません: ${error.message}`);
    } finally {
      setCloudBusy(false);
    }
  }, []);

  const requestCloudSignOut = useCallback(async () => {
    setCloudBusy(true);
    try {
      await signOutCloud();
      setCloudMessage('クラウドからログアウトしました。ローカルデータは維持されます。');
      setCloudLastSyncedAt(null);
    } catch (error) {
      setCloudMessage(`ログアウトできません: ${error.message}`);
    } finally {
      setCloudBusy(false);
    }
  }, []);

  const syncStateToCloud = useCallback(async (battleSnapshot = savedBattle, quiet = false) => {
    const userId = cloudSession?.user?.id;
    if (!userId) {
      if (!quiet) setCloudMessage('先にメールでサインインしてください。');
      return false;
    }
    setCloudBusy(true);
    if (!quiet) setCloudMessage('クラウドへ保存中…');
    try {
      const syncedAt = new Date().toISOString();
      const result = await uploadCloudState(userId, { version: 1, profile, battle: battleSnapshot, syncedAt });
      setCloudLastSyncedAt(result.updated_at ?? syncedAt);
      setCloudMessage(quiet ? '戦闘保存をクラウドへ同期しました。' : '戦績と戦闘保存をクラウドへ同期しました。');
      return true;
    } catch (error) {
      setCloudMessage(`クラウド保存に失敗しました: ${error.message}`);
      return false;
    } finally {
      setCloudBusy(false);
    }
  }, [cloudSession?.user?.id, profile, savedBattle]);

  const syncStateFromCloud = useCallback(async () => {
    const userId = cloudSession?.user?.id;
    if (!userId) {
      setCloudMessage('先にメールでサインインしてください。');
      return;
    }
    setCloudBusy(true);
    setCloudMessage('クラウドから復元中…');
    try {
      const result = await downloadCloudState(userId);
      if (!result?.save_data || result.save_data.version !== 1) {
        setCloudMessage('クラウドに保存データがありません。');
        return;
      }
      const restoredProfile = normalizeProfile(result.save_data.profile);
      const restoredBattle = normalizeSavedBattle(result.save_data.battle);
      setProfile(restoredProfile);
      setSavedBattle(restoredBattle);
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(restoredProfile));
      if (restoredBattle) window.localStorage.setItem(BATTLE_STORAGE_KEY, JSON.stringify(restoredBattle));
      else window.localStorage.removeItem(BATTLE_STORAGE_KEY);
      setCloudLastSyncedAt(result.updated_at ?? result.save_data.syncedAt ?? null);
      setCloudMessage(restoredBattle ? '戦績と戦闘保存を復元しました。「戦闘を再開」から続行できます。' : 'クラウドの戦績を復元しました。');
    } catch (error) {
      setCloudMessage(`クラウド復元に失敗しました: ${error.message}`);
    } finally {
      setCloudBusy(false);
    }
  }, [cloudSession?.user?.id]);

  const discardSavedBattle = useCallback(() => {
    try { window.localStorage.removeItem(BATTLE_STORAGE_KEY); } catch { /* private browsing or storage quota */ }
    setSavedBattle(null);
  }, []);

  const saveBattle = useCallback(() => {
    if (briefingOpen || status !== 'active') return;
    const storedAirWing = airWing.status === 'attack' ? { ...airWing, status: 'returning', phase: 0 } : airWing;
    const storedThreat = incomingThreat && incomingThreat.eta > 0 ? incomingThreat : null;
    const snapshot = {
      version: 1,
      savedAt: Date.now(),
      payload: {
        scenarioId, difficultyId, activeCampaignId, ships, selectedId, targetId, weaponId,
        cooldown, clock, score, combatStats, formation, waypoint, incomingThreat: storedThreat,
        defense, defenseStats, airWing: storedAirWing, airStats, sonarPing, sonarCooldown,
        aswStats, damageControl, dcCooldown,
        resolvedThreatIds: [...resolvedThreatsRef.current].filter(id => id !== storedThreat?.id),
        resolvedSortieIds: storedAirWing.status === 'returning' ? [] : [...resolvedSortiesRef.current],
      },
    };
    try {
      window.localStorage.setItem(BATTLE_STORAGE_KEY, JSON.stringify(snapshot));
      setSavedBattle(snapshot);
      setEvent(`戦闘状況を保存 — ${SCENARIOS[scenarioId].code} 戦術時間 ${formatMissionTime(clock)}`);
      audioEngine.play('ui');
      if (cloudSession?.user?.id) void syncStateToCloud(snapshot, true);
    } catch {
      setEvent('保存失敗 — ブラウザの保存領域を利用できません');
    }
  }, [activeCampaignId, airStats, airWing, aswStats, audioEngine, briefingOpen, clock, cloudSession?.user?.id, combatStats, cooldown, damageControl, dcCooldown, defense, defenseStats, difficultyId, formation, incomingThreat, scenarioId, score, selectedId, ships, sonarCooldown, sonarPing, status, syncStateToCloud, targetId, waypoint, weaponId]);

  const resumeBattle = useCallback(() => {
    const payload = savedBattle?.payload;
    if (!payload || !SCENARIOS[payload.scenarioId] || !DIFFICULTIES[payload.difficultyId] || !Array.isArray(payload.ships)) {
      discardSavedBattle();
      return;
    }
    const restoredAirWing = payload.airWing?.status === 'attack'
      ? { ...payload.airWing, status: 'returning', phase: 0 }
      : payload.airWing ?? initialAirWing();
    const restoredThreats = new Set(payload.resolvedThreatIds ?? []);
    if (payload.incomingThreat?.id) restoredThreats.delete(payload.incomingThreat.id);
    setScenarioId(payload.scenarioId);
    setDifficultyId(payload.difficultyId);
    setActiveCampaignId(CAMPAIGN_OPERATIONS.some(operation => operation.id === payload.activeCampaignId) ? payload.activeCampaignId : null);
    setShips(payload.ships);
    setSelectedId(payload.selectedId ?? 'burke');
    setTargetId(payload.targetId ?? 'daring');
    setWeaponId(payload.weaponId ?? 'sm2');
    setCooldown(payload.cooldown ?? 0);
    setClock(payload.clock ?? 0);
    setScore(payload.score ?? 0);
    setCombatStats(payload.combatStats ?? { fired: 0, hits: 0, kills: 0 });
    setFormation(payload.formation === 'ring' ? 'ring' : 'line');
    setWaypoint(payload.waypoint ?? null);
    setIncomingThreat(payload.incomingThreat ?? null);
    setDefense(payload.defense ?? startingDefense(profile.upgrades.defense));
    setDefenseStats(payload.defenseStats ?? { intercepts: 0, evades: 0, hits: 0 });
    setAirWing(restoredAirWing);
    setAirStats(payload.airStats ?? { sorties: 0, hits: 0, cap: 0 });
    setSonarPing(payload.sonarPing ?? 0);
    setSonarCooldown(payload.sonarCooldown ?? 0);
    setAswStats(payload.aswStats ?? { pings: 0, contacts: 0 });
    setDamageControl(payload.damageControl ?? startingDamageControl(profile.upgrades.damage));
    setDcCooldown(payload.dcCooldown ?? 0);
    setShot(null);
    setDefenseEffect(null);
    setLastRewards(null);
    setTutorialOpen(false);
    setTutorialStep(0);
    setPaused(true);
    setBriefingOpen(false);
    resolvedThreatsRef.current = restoredThreats;
    resolvedSortiesRef.current = new Set(payload.resolvedSortieIds ?? []);
    missionRecordedRef.current = false;
    setEvent(`保存データを復元 — ${SCENARIOS[payload.scenarioId].code} 戦術時間 ${formatMissionTime(payload.clock ?? 0)}`);
    audioEngine.play('start');
  }, [audioEngine, discardSavedBattle, profile.upgrades.damage, profile.upgrades.defense, savedBattle]);

  const resetExercise = useCallback((showBriefing = false) => {
    setShips(initialShips()); setSelectedId('burke'); setTargetId(initialTargetIdForScenario(scenarioId)); setWeaponId('sm2'); setPaused(false); setCooldown(0); setClock(0); setScore(0);
    setCombatStats({ fired: 0, hits: 0, kills: 0 }); setFormation('line'); setWaypoint(null); setIncomingThreat(null);
    setDefense(startingDefense(profile.upgrades.defense)); setDefenseStats({ intercepts: 0, evades: 0, hits: 0 }); setDefenseEffect(null);
    setAirWing(initialAirWing()); setAirStats({ sorties: 0, hits: 0, cap: 0 }); setSonarPing(0); setSonarCooldown(0); setAswStats({ pings: 0, contacts: 0 });
    setDamageControl(startingDamageControl(profile.upgrades.damage)); setDcCooldown(0); resolvedThreatsRef.current.clear(); resolvedSortiesRef.current.clear(); missionRecordedRef.current = false; setShot(null); setLastRewards(null); setTutorialOpen(false); setTutorialStep(0);
    setBriefingOpen(showBriefing); setEvent(showBriefing ? '作戦選択待機。' : `${campaignOperation ? `${campaignOperation.code} ${campaignOperation.name}` : SCENARIOS[scenarioId].name}開始。海面クリックで艦隊移動。`);
  }, [scenarioId, campaignOperation, profile.upgrades.defense, profile.upgrades.damage]);
  const restart = useCallback(() => resetExercise(false), [resetExercise]);
  const startExercise = useCallback(() => {
    audioEngine.play('start');
    discardSavedBattle();
    resetExercise(false);
    if (!profile.tutorialSeen) {
      tutorialWasPausedRef.current = false;
      setTutorialStep(0);
      setTutorialOpen(true);
      setPaused(true);
    }
  }, [audioEngine, discardSavedBattle, resetExercise, profile.tutorialSeen]);
  const openScenarioSelection = useCallback(() => resetExercise(true), [resetExercise]);
  const toggleAudio = useCallback(() => {
    setAudioEnabled(current => {
      const next = !current;
      audioEngine.setMuted(!next);
      if (next) audioEngine.play('ui');
      return next;
    });
  }, [audioEngine]);

  useEffect(() => {
    if (!briefingOpen && status !== 'active' && savedBattle) discardSavedBattle();
  }, [briefingOpen, discardSavedBattle, savedBattle, status]);

  const cloudPanel = useMemo(() => ({
    configured: cloudSyncConfigured,
    session: cloudSession,
    busy: cloudBusy,
    message: cloudMessage,
    lastSyncedAt: cloudLastSyncedAt,
    onSignIn: requestCloudSignIn,
    onSignOut: requestCloudSignOut,
    onUpload: syncStateToCloud,
    onDownload: syncStateFromCloud,
  }), [cloudBusy, cloudLastSyncedAt, cloudMessage, cloudSession, requestCloudSignIn, requestCloudSignOut, syncStateFromCloud, syncStateToCloud]);

  return (
    <main className={`game-shell ${incomingThreat ? 'threat-active' : ''} ${(selected.fire ?? 0) > 0 || (selected.flooding ?? 0) > 0 ? 'casualty-active' : ''} ${shot?.hit ? 'ordnance-impact' : shot ? 'ordnance-active' : ''} ${defenseEffect?.type === 'impact' ? 'incoming-impact' : ''}`}>
      <div className="ocean-layer" aria-hidden="true" />
      <div className="combat-atmosphere" aria-hidden="true"><i/><i/><i/></div>
      <header className="topbar">
        <div className="wordmark"><span className="mark">PS</span><strong>PACIFIC SHIELD</strong></div>
        <div className="top-stat"><span>{campaignOperation ? `${campaignOperation.code} · ${campaignOperation.name}` : `${scenario.code} · ${scenario.name}`}</span></div>
        <div className="top-stat weather"><span>17°C</span><span>風向 248°</span><span>風速 18kt</span></div>
        <div className="top-stat sea-state"><span>海況 3</span></div>
        <div className="combat-score"><span>SCORE</span><b>{String(evaluatedScore).padStart(5, '0')}</b><small>{difficulty.name} · HIT {accuracy}%</small></div>
        {!briefingOpen && status === 'active' ? <button className="save-button" onClick={saveBattle} aria-label="戦闘途中の状態を保存" title="戦闘を保存"><Icon name="save" size={17}/><span>保存</span></button> : null}
        <button className={`audio-button ${audioEnabled ? 'enabled' : 'muted'}`} onClick={toggleAudio} aria-pressed={audioEnabled} aria-label={audioEnabled ? '音響を消音' : '音響を有効化'} title={audioEnabled ? '音響 ON' : '音響 OFF'}><Icon name={audioEnabled ? 'audio' : 'muted'} size={18}/><span>{audioEnabled ? 'SOUND' : 'MUTED'}</span></button>
        <button className="guide-button" onClick={openTutorial}><Icon name="target" size={17}/><span>操作ガイド</span></button>
        <button className="pause-button" onClick={() => setPaused(p => !p)}>{paused ? <Icon name="play"/> : <Icon name="pause"/>}<span>{paused ? '再開' : '一時停止'}</span></button>
      </header>

      <div className="mission-card hud-panel"><span>任務目標</span><strong><Icon name="target" size={16}/>{scenario.objective}</strong><div><i style={{ width: `${progress}%` }} /></div><small>{missionProgress}</small></div>
      <div className="left-hud-stack" aria-label="艦隊管制">
        <FleetRail ships={blueShips} selectedId={selectedId} onSelect={selectShip} />
        <ShipDetails ship={selected} />
      </div>
      <div className="right-hud-stack" aria-label="戦術システム">
        {selectedTarget ? <TargetPanel target={selectedTarget} distance={targetDistance} chance={targetChance} intentTargetCode={intentTargetCode} /> : null}
        <DefensePanel threat={incomingThreat} defense={defense} stats={defenseStats} onIntercept={interceptThreat} onJam={jamThreat} onDecoy={deployDecoy} />
        <AirWingPanel wing={airWing} stats={airStats} carrierReady={flightDeckReady} strikeReady={Boolean(selectedTarget)} onLaunch={launchAirMission} />
        {oryu ? <SubmarinePanel submarine={oryu} sonarPing={sonarPing} sonarCooldown={sonarCooldown} contact={submarineContact} stats={aswStats} onDepth={changeSubmarineDepth} onSilent={toggleSilentRunning} onPing={activateSonar} /> : null}
        <DamageControlPanel ship={selected} resources={damageControl} cooldown={dcCooldown} onDrill={startDamageDrill} onFire={extinguishFire} onPump={dewaterShip} onRepair={emergencyRepair} />
      </div>

      <section className="battlefield" aria-label="戦闘海域。空いている海面をクリックして艦隊移動" onClick={commandWaypoint}>
        {ships.map(ship => {
          if (ship.side === 'blue') return <BattleShip key={ship.id} ship={ship} selected={ship.id === selectedId} targeted={false} threatened={ship.id === incomingThreat?.targetId} onSelect={selectShip} onTarget={selectTarget} />;
          const contactState = contactStates.get(ship.id)?.state;
          if (contactState === 'hidden') return null;
          if (contactState === 'contact') return <UnknownContact key={ship.id} ship={ship} onInspect={selectTarget} />;
          return <BattleShip key={ship.id} ship={ship} selected={false} targeted={ship.id === selectedTarget?.id} threatened={false} onSelect={selectShip} onTarget={selectTarget} />;
        })}
        {waypoint ? <div className={`destination-marker ${formationSettled ? 'settled' : ''}`} style={{ left: `${waypoint.x}%`, top: `${waypoint.y}%` }} aria-label={`移動目標地点 ${formationSettled ? '到着' : '航行中'}`}><Icon name="waypoint" size={28}/><span>{formationSettled ? 'ON STATION' : 'WAYPOINT'}</span></div> : null}
        {shot ? <><span key={shot.id} className="launch-bloom" style={{ left: `${shot.from.x}%`, top: `${shot.from.y}%` }}><i/><i/></span><span className="projectile" style={{ '--x1': `${shot.from.x}%`, '--y1': `${shot.from.y}%`, '--x2': `${shot.to.x}%`, '--y2': `${shot.to.y}%` }} /><span className={`impact ${shot.hit ? '' : 'miss'}`} style={{ left: `${shot.to.x}%`, top: `${shot.to.y}%` }}><i/><i/><i/><b/></span></> : null}
        {incomingThreat && currentThreatPosition ? <div className={`incoming-missile ${incomingThreat.kind ?? 'missile'} ${incomingThreat.jammed ? 'jammed' : ''}`} style={{ left: `${currentThreatPosition.x}%`, top: `${currentThreatPosition.y}%` }} aria-label={`敵${incomingThreat.kind === 'torpedo' ? '魚雷' : incomingThreat.kind === 'airraid' ? `F-35B ${incomingThreat.aircraft}機` : 'ミサイル'}接近、攻撃まで${incomingThreat.eta}秒`}><Icon name={incomingThreat.kind === 'torpedo' ? 'sonar' : incomingThreat.kind === 'airraid' ? 'aircraft' : 'missile'} size={19}/><span>{incomingThreat.eta}</span>{incomingThreat.kind === 'airraid' ? <b className="raid-count">{incomingThreat.aircraft}機</b> : null}</div> : null}
        {incomingThreat?.decoy ? <div className={`decoy-cloud ${incomingThreat.kind ?? ''}`} style={{ left: `${incomingThreat.end.x}%`, top: `${incomingThreat.end.y}%` }} aria-label={incomingThreat.kind === 'torpedo' ? '音響囮展開中' : 'デコイ展開中'}><i/><i/><i/><span>{incomingThreat.kind === 'torpedo' ? 'ACOUSTIC' : 'DECOY'}</span></div> : null}
        {defenseEffect ? <div className={`defense-effect ${defenseEffect.type}`} style={{ left: `${defenseEffect.x}%`, top: `${defenseEffect.y}%` }} aria-hidden="true"><Icon name={defenseEffect.type === 'intercept' ? 'shield' : defenseEffect.type === 'air-intercept' ? 'aircraft' : 'missile'} size={24}/></div> : null}
        {airWing.status !== 'ready' && airWing.status !== 'rearming' && airWing.status !== 'diverted' ? <AirGroup wing={airWing} /> : null}
        {sonarPing > 0 && oryu.hp > 0 ? <div className="sonar-pulse" style={{ left: `${oryu.x}%`, top: `${oryu.y}%` }} aria-label={`アクティブソナー送信中、残り${sonarPing}秒`}><Icon name="sonar" size={18}/><span>PING {sonarPing}</span></div> : null}
      </section>

      <div className="event-log" aria-live="polite"><span>TACTICAL</span>{event}</div>
      <Radar ships={ships} selectedId={selectedId} targetId={selectedTarget?.id} onTarget={selectTarget} contactStates={contactStates} />
      <CommandDeck ship={selected} weaponId={weaponId} onWeapon={setWeaponId} onSpeed={changeSpeed} onHeading={changeHeading} onFire={fire} cooldown={cooldown} fireState={fireState} formation={formation} onFormation={commandFormation} />

      {paused && !briefingOpen && !tutorialOpen && status === 'active' ? <div className="pause-overlay"><span>PAUSED</span><strong>戦術時間停止</strong><small>P または「再開」で続行</small></div> : null}
      {!briefingOpen && status !== 'active' ? <div className={`result-overlay ${status}`}><Icon name={status === 'victory' ? 'target' : 'crosshair'} size={42}/><span>EXERCISE COMPLETE · {campaignOperation?.code ?? scenario.code}</span><strong>{status === 'victory' ? scenario.objective : '任務続行不能'}</strong><p>{status === 'victory' ? `${campaignOperation?.name ?? scenario.name}の任務目標を達成しました。` : '護衛対象またはBLUE CELL戦力が行動不能です。'}</p><div className="result-stats"><span>評価 <b>{grade}</b></span><span>得点 <b>{evaluatedScore}</b></span><span>命中率 <b>{accuracy}%</b></span><span>無力化 <b>{combatStats.kills}</b></span></div>{lastRewards ? <div className="mission-rewards"><span>MISSION REWARDS</span><b>+{lastRewards.xp} XP</b><b>+{lastRewards.credits} PT</b>{lastRewards.campaign ? <em>{'★'.repeat(lastRewards.campaign.stars)} {lastRewards.campaign.name}</em> : null}{lastRewards.medals.map(id => <em key={id}>{MEDALS[id].mark} {MEDALS[id].name}</em>)}</div> : null}<div className="result-actions"><button onClick={restart}><Icon name="restart"/>再演習</button><button onClick={openScenarioSelection}><Icon name="target"/>シナリオ選択</button></div></div> : null}
      {briefingOpen ? <ScenarioBriefing scenarioId={scenarioId} difficultyId={difficultyId} activeCampaignId={activeCampaignId} profile={profile} savedBattle={savedBattle} cloud={cloudPanel} onScenario={selectFreeScenario} onDifficulty={setDifficultyId} onCampaign={selectCampaignOperation} onUpgrade={upgradeFleet} onTutorial={openTutorial} onStart={startExercise} onResume={resumeBattle} /> : null}
      {tutorialOpen ? <TutorialOverlay stepIndex={tutorialStep} onStep={goTutorialStep} onClose={closeTutorial} /> : null}
    </main>
  );
}

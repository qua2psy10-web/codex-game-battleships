const assetUrl = fileName => `${import.meta.env.BASE_URL}assets/${fileName}`;

export const SHIPS = [
  {
    id: 'ford', side: 'blue', country: 'アメリカ', flag: '🇺🇸', code: 'CVN-78',
    name: 'USS GERALD R. FORD', className: 'Gerald R. Ford級 航空母艦',
    role: '航空母艦', asset: assetUrl('ship-carrier.png'), hp: 14000, maxHp: 14000,
    speed: 22, maxSpeed: 30, heading: 62, x: 35, y: 58, scale: 1.28,
    sensorRange: 27, sonarRange: 18,
    crew: '4,539名', radar: 'AN/SPY-3', sonar: 'AN/SQQ-89', ew: 'SLQ-32',
    weapons: [{ id: 'f35', name: 'F-35C', ammo: 24, damage: 38 }, { id: 'essm', name: 'RIM-162', ammo: 32, damage: 22 }, { id: 'ciws', name: 'CIWS', ammo: 9, damage: 12 }],
  },
  {
    id: 'burke', side: 'blue', country: 'アメリカ', flag: '🇺🇸', code: 'DDG-51',
    name: 'USS ARLEIGH BURKE', className: 'Arleigh Burke級 ミサイル駆逐艦',
    role: 'ミサイル駆逐艦', asset: assetUrl('ship-burke.png'), hp: 8900, maxHp: 8900,
    speed: 26, maxSpeed: 31, heading: 65, x: 57, y: 68, scale: .82,
    sensorRange: 32, sonarRange: 28,
    crew: '329名', radar: 'AN/SPY-1D', sonar: 'AN/SQS-53', ew: 'SLQ-32',
    weapons: [{ id: 'sm2', name: 'RIM-66 SM-2', ammo: 32, damage: 30 }, { id: 'harpoon', name: 'Harpoon', ammo: 8, damage: 46 }, { id: 'ciws', name: 'CIWS', ammo: 6, damage: 12 }],
  },
  {
    id: 'oryu', side: 'blue', country: '日本', flag: '🇯🇵', code: 'SS-511',
    name: 'JS ORYU', className: 'そうりゅう型 潜水艦', role: '攻撃型潜水艦',
    asset: assetUrl('ship-submarine.png'), hp: 5200, maxHp: 5200,
    speed: 18, maxSpeed: 20, heading: 52, x: 25, y: 76, scale: .62,
    sensorRange: 23, sonarRange: 34, submarine: true, depthMode: 'deep', silent: true,
    crew: '65名', radar: 'ZPS-6F', sonar: 'ZQQ-7B', ew: '潜航中',
    weapons: [{ id: 'type89', name: '89式魚雷', ammo: 12, damage: 58 }, { id: 'subharpoon', name: 'UGM-84', ammo: 6, damage: 43 }],
  },
  {
    id: 'queen', side: 'orange', country: 'イギリス', flag: '🇬🇧', code: 'R08',
    name: 'HMS QUEEN ELIZABETH', className: 'Queen Elizabeth級 航空母艦', role: '演習対抗艦',
    asset: assetUrl('ship-carrier.png'), hp: 100, maxHp: 100, speed: 18, maxSpeed: 25,
    heading: 238, x: 77, y: 26, scale: .64,
  },
  {
    id: 'daring', side: 'orange', country: 'イギリス', flag: '🇬🇧', code: 'D32',
    name: 'HMS DARING', className: 'Type 45 駆逐艦', role: '演習対抗艦',
    asset: assetUrl('ship-maya.png'), hp: 100, maxHp: 100, speed: 22, maxSpeed: 29,
    heading: 232, x: 65, y: 43, scale: .48,
  },
  {
    id: 'dosan', side: 'orange', country: '韓国', flag: '🇰🇷', code: 'SS-083',
    name: 'ROKS DOSAN AHN CHANGHO', className: 'Dosan Ahn Changho級 潜水艦', role: '演習対抗潜水艦',
    asset: assetUrl('ship-submarine.png'), hp: 100, maxHp: 100, speed: 10, maxSpeed: 20,
    heading: 276, x: 48, y: 83, scale: .52, submarine: true, depthMode: 'deep', silent: true,
    acoustic: .3,
  },
];

export const SPEED_STEPS = [0, 8, 16, 24, 30];

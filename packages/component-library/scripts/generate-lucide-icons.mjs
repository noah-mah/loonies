import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lucide = require('lucide-react');

const iconsRoot = path.resolve(__dirname, '../src/icons');

const lucideNames = new Set(
  Object.keys(lucide).filter(
    k =>
      /^[A-Z]/.test(k) &&
      !k.endsWith('Icon') &&
      !k.startsWith('Lucide') &&
      typeof lucide[k] === 'object',
  ),
);

const OVERRIDES = {
  // v0
  Add: 'Plus',
  Delete: 'X',
  ExpandArrow: 'ChevronDown',
  Hash: 'Hash',
  LeftArrow2: 'ArrowLeft',
  Math: 'Calculator',
  Merge: 'Merge',
  RightArrow2: 'ArrowRight',
  Split: 'Split',
  Subtract: 'Minus',

  // v2
  AlertTriangle: 'TriangleAlert',
  ArrowButtonDown1: 'ChevronDown',
  ArrowButtonLeft1: 'ChevronLeft',
  ArrowButtonRight1: 'ChevronRight',
  ArrowButtonSingleLeft1: 'ChevronLeft',
  ArrowButtonUp1: 'ChevronUp',
  ArrowsExpand3: 'Maximize2',
  ArrowsShrink3: 'Minimize2',
  ArrowsSynchronize: 'RefreshCw',
  Calendar: 'Calendar',
  Calendar3: 'CalendarDays',
  Check: 'Check',
  CheckAll: 'CheckCheck',
  CheckCircle1: 'CircleCheck',
  CheckCircleHollow: 'Circle',
  CloseParenthesis: 'Parentheses',
  CloudUnknown: 'CloudCog',
  CloudUpload: 'CloudUpload',
  CustomNotesPaper: 'FileText',
  DownAndRightArrow: 'CornerDownRight',
  DownloadThickBottom: 'Download',
  EditSkull1: 'Skull',
  FavoriteStar: 'Star',
  Filter2: 'Filter',
  Help: 'CircleHelp',
  Hyperlink2: 'ExternalLink',
  Hyperlink3: 'Link',
  InformationCircle: 'Info',
  Key: 'Key',
  LockClosed: 'Lock',
  MoonStars: 'MoonStar',
  NavigationMenu: 'Menu',
  NotesPaper: 'File',
  NotesPaperText: 'FileText',
  OpenParenthesis: 'Parentheses',
  Pencil1: 'Pencil',
  PencilWriteAlternate: 'PenLine',
  RefreshArrow: 'RefreshCw',
  Remove: 'X',
  RemoveAlternate: 'CircleX',
  Search1: 'Search',
  SearchAlternate: 'Search',
  SettingsSliderAlternate: 'SlidersHorizontal',
  Sum: 'Sigma',
  Sun: 'Sun',
  System: 'Monitor',
  UncheckAll: 'ListX',
  UploadThickBottom: 'Upload',
  ValidationCheck: 'Check',
  ViewHide: 'EyeOff',
  ViewShow: 'Eye',

  // v1
  AddOutline: 'CirclePlus',
  AddSolid: 'Plus',
  Adjust: 'SlidersHorizontal',
  Airplane: 'Plane',
  Album: 'DiscAlbum',
  AlignJustified: 'AlignJustify',
  Announcement: 'Megaphone',
  Apparel: 'Shirt',
  ArrowOutlineDown: 'CircleArrowDown',
  ArrowOutlineLeft: 'CircleArrowLeft',
  ArrowOutlineRight: 'CircleArrowRight',
  ArrowOutlineUp: 'CircleArrowUp',
  ArrowThickDown: 'ArrowDown',
  ArrowThickLeft: 'ArrowLeft',
  ArrowThickRight: 'ArrowRight',
  ArrowThickUp: 'ArrowUp',
  ArrowThinDown: 'ChevronDown',
  ArrowThinLeft: 'ChevronLeft',
  ArrowThinRight: 'ChevronRight',
  ArrowThinUp: 'ChevronUp',
  Artist: 'MicVocal',
  AtSymbol: 'AtSign',
  Attachment: 'Paperclip',
  Backspace: 'Delete',
  Backward: 'Rewind',
  BackwardStep: 'SkipBack',
  BatteryHalf: 'BatteryMedium',
  Beverage: 'CupSoda',
  Block: 'Ban',
  Bolt: 'Zap',
  BookmarkCopy2: 'Bookmark',
  BookmarkCopy3: 'Bookmark',
  BookmarkOutline: 'Bookmark',
  BookmarkOutlineAdd: 'BookmarkPlus',
  BookReference: 'BookMarked',
  BorderAll: 'Square',
  BorderBottom: 'Square',
  BorderHorizontal: 'Square',
  BorderInner: 'Square',
  BorderLeft: 'Square',
  BorderNone: 'SquareDashed',
  BorderOuter: 'Square',
  BorderRight: 'Square',
  BorderTop: 'Square',
  BorderVertical: 'Square',
  BrightnessDown: 'SunDim',
  BrightnessUp: 'Sun',
  BrowserWindow: 'AppWindow',
  BrowserWindowNew: 'AppWindow',
  BrowserWindowOpen: 'AppWindow',
  Buoy: 'LifeBuoy',
  Chart: 'ChartNoAxesColumn',
  ChartBar: 'ChartColumn',
  ChatBubbleDots: 'MessageCircle',
  CheckAlternative: 'Check',
  Checkmark: 'Check',
  CheckmarkOutline: 'CircleCheck',
  CheveronDown: 'ChevronDown',
  CheveronDownUp: 'ChevronsUpDown',
  CheveronLeft: 'ChevronLeft',
  CheveronOutlineDown: 'ChevronDown',
  CheveronOutlineLeft: 'ChevronLeft',
  CheveronOutlineRight: 'ChevronRight',
  CheveronOutlineUp: 'ChevronUp',
  CheveronRight: 'ChevronRight',
  CheveronUp: 'ChevronUp',
  CheveronUpDown: 'ChevronsUpDown',
  Close: 'X',
  CloseOutline: 'CircleX',
  CloseSolid: 'X',
  CloudWarning: 'CloudAlert',
  Cog: 'Settings',
  ColorPalette: 'Palette',
  Compose: 'PenLine',
  ComputerDesktop: 'Monitor',
  ComputerLaptop: 'Laptop',
  Conversation: 'MessagesSquare',
  CurrencyDollar: 'DollarSign',
  Dashboard: 'LayoutDashboard',
  DateAdd: 'CalendarPlus',
  DialPad: 'Grid3x3',
  Directions: 'Signpost',
  Document: 'FileText',
  DocumentAdd: 'FilePlus',
  DotsHorizontalDouble: 'Ellipsis',
  DotsHorizontalTriple: 'Ellipsis',
  Duplicate: 'Copy',
  EditCopy: 'Copy',
  EditCrop: 'Crop',
  EditCut: 'Scissors',
  EditPencil: 'Pencil',
  Education: 'GraduationCap',
  Envelope: 'Mail',
  Equals: 'Equal',
  ExclamationOutline: 'CircleAlert',
  ExclamationSolid: 'CircleAlert',
  Explore: 'Compass',
  FastRewind: 'Rewind',
  FileDouble: 'Files',
  FolderOutline: 'Folder',
  FolderOutlineAdd: 'FolderPlus',
  FormatBold: 'Bold',
  FormatFontSize: 'ALargeSmall',
  FormatItalic: 'Italic',
  FormatTextSize: 'Type',
  FormatUnderline: 'Underline',
  ForwardStep: 'SkipForward',
  HandStop: 'Hand',
  Hot: 'Flame',
  HourGlass: 'Hourglass',
  InboxCheck: 'Inbox',
  InboxDownload: 'Inbox',
  InboxFull: 'Inbox',
  IndentDecrease: 'Outdent',
  IndentIncrease: 'Indent',
  InformationOutline: 'Info',
  InformationSolid: 'Info',
  LightBulb: 'Lightbulb',
  ListAdd: 'ListPlus',
  ListBullet: 'List',
  LoadBalancer: 'Network',
  Location: 'MapPin',
  LocationCurrent: 'Locate',
  LocationFood: 'Utensils',
  LocationGasStation: 'Fuel',
  LocationHotel: 'Hotel',
  LocationMarina: 'Ship',
  LocationPark: 'Trees',
  LocationRestroom: 'DoorOpen',
  LocationShopping: 'ShoppingBag',
  MinusOutline: 'CircleMinus',
  MinusSolid: 'Minus',
  MobileDevices: 'Smartphone',
  MoneyBag: 'HandCoins',
  MoodHappyOutline: 'Smile',
  MoodHappySolid: 'Smile',
  MoodNeutralOutline: 'Meh',
  MoodNeutralSolid: 'Meh',
  MoodSadOutline: 'Frown',
  MoodSadSolid: 'Frown',
  MoveBack: 'Undo2',
  MusicAlbum: 'Disc3',
  MusicArtist: 'MicVocal',
  MusicNotes: 'Music',
  MusicPlaylist: 'ListMusic',
  NavigationMore: 'EllipsisVertical',
  NewsPaper: 'Newspaper',
  Notification: 'Bell',
  Notifications: 'Bell',
  NotificationsOutline: 'Bell',
  Paste: 'ClipboardPaste',
  PauseOutline: 'CirclePause',
  PauseSolid: 'Pause',
  PencilWrite: 'PenLine',
  Photo: 'Image',
  PhpElephant: 'Code2',
  PlayOutline: 'CirclePlay',
  Playlist: 'ListMusic',
  Plugin: 'Puzzle',
  Portfolio: 'Briefcase',
  Pylon: 'Cone',
  Question: 'CircleHelp',
  Queue: 'ListOrdered',
  RadarCopy2: 'Radar',
  Refresh: 'RefreshCw',
  Reload: 'RotateCw',
  Reports: 'FileChartColumn',
  Repost: 'Repeat2',
  SaveDisk: 'Save',
  ScreenFull: 'Maximize',
  Servers: 'Server',
  Share01: 'Share2',
  ShareAlt: 'Share',
  ShowSidebar: 'PanelLeft',
  StandBy: 'Power',
  StarFull: 'Star',
  Station: 'RadioTower',
  StepBackward: 'SkipBack',
  StepForward: 'SkipForward',
  StoreFront: 'Store',
  StrokeWidth: 'Baseline',
  SubdirectoryLeft: 'CornerDownLeft',
  SubdirectoryRight: 'CornerDownRight',
  Swap: 'ArrowLeftRight',
  TextBox: 'TextCursorInput',
  TextDecoration: 'Baseline',
  Time: 'Clock',
  ToolsCopy: 'Wrench',
  Translate: 'Languages',
  Trash: 'Trash2',
  Travel: 'Plane',
  TravelBus: 'Bus',
  TravelCar: 'Car',
  TravelCase: 'Briefcase',
  TravelTaxiCab: 'CarTaxiFront',
  TravelTrain: 'TrainFront',
  TravelWalk: 'Footprints',
  Tuning: 'SlidersHorizontal',
  UserAdd: 'UserPlus',
  UserGroup: 'Users',
  UserSolidCircle: 'CircleUser',
  UserSolidSquare: 'SquareUser',
  Vector: 'Spline',
  VideoCamera: 'Video',
  ViewCarousel: 'GalleryHorizontal',
  ViewColumn: 'Columns3',
  ViewList: 'List',
  ViewTile: 'LayoutGrid',
  VolumeDown: 'Volume1',
  VolumeMute: 'VolumeX',
  VolumeUp: 'Volume2',
  Window: 'AppWindow',
  WindowNew: 'AppWindow',
  WindowOpen: 'AppWindow',
  YinYang: 'CircleDashed',
};

function resolveLucideName(basename) {
  if (OVERRIDES[basename]) {
    const n = OVERRIDES[basename];
    if (!lucideNames.has(n)) {
      throw new Error(`Override ${basename} -> ${n} not in lucide-react`);
    }
    return n;
  }
  if (lucideNames.has(basename)) return basename;
  const noDigits = basename.replace(/\d+$/, '');
  if (noDigits !== basename && lucideNames.has(noDigits)) return noDigits;
  const tweaks = [
    basename.replace(/^Cheveron/, 'Chevron'),
    basename.replace(/Outline$/, ''),
    basename.replace(/Solid$/, ''),
  ];
  for (const t of tweaks) {
    if (lucideNames.has(t)) return t;
  }
  throw new Error(`No Lucide mapping for ${basename}`);
}

function writeIconFile(dir, basename, lucideName) {
  const content = `import { ${lucideName} } from 'lucide-react';

import { createLucideIcon } from '../createLucideIcon';

export const Svg${basename} = createLucideIcon(${lucideName});
`;
  fs.writeFileSync(path.join(dir, `${basename}.tsx`), content);
}

function processVersion(version) {
  const dir = path.join(iconsRoot, version);
  const basenames = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => f.replace(/\.tsx$/, ''));
  const mappings = [];
  for (const basename of basenames) {
    const lucideName = resolveLucideName(basename);
    writeIconFile(dir, basename, lucideName);
    mappings.push({ basename, lucideName });
  }
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.svg')) fs.unlinkSync(path.join(dir, f));
  }
  return mappings;
}

const all = {};
for (const v of ['v0', 'v1', 'v2']) {
  all[v] = processVersion(v);
  console.log(`${v}: ${all[v].length} icons`);
}

fs.writeFileSync(
  path.resolve(__dirname, '../src/icons/lucide-map.json'),
  JSON.stringify(all, null, 2),
);
console.log('Wrote lucide-map.json');

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { getFirebaseDb, isFirebaseConfigured } from '../firebase'
import { type SeatLayout, DEFAULT_LAYOUTS } from '../types/layout'
import defaultClassmates from '../data/classmates.json'

export interface Classmate {
  number: number
  name: string
  ruby: string
}

export interface SeatEntry {
  number: number
  name: string
  ruby: string
}

export interface HistoryEntry {
  key: string
  seatMap: SeatEntry[]
  createdAt: string
  action?: string
}

const LOCAL_STORAGE_LAYOUTS_KEY = 'seat_changer_layouts'
const LOCAL_STORAGE_ACTIVE_LAYOUT_KEY = 'seat_changer_active_layout_id'
const LOCAL_STORAGE_HISTORY_KEY = 'seat_changer_history'
const LOCAL_STORAGE_CURRENT_SEAT_KEY = 'seat_changer_current_seat'
const LOCAL_STORAGE_FRONT_ROW_KEY = 'seat_changer_front_row'
const LOCAL_STORAGE_PATTERN_FRONT_ROWS_KEY = 'seat_changer_pattern_front_rows'

// レイアウトオブジェクトをFirestoreおよびローカル用に安全に正規化（undefinedを徹底排除）
export function sanitizeLayout(l: SeatLayout): SeatLayout {
  return {
    id: String(l.id || `layout-${Date.now()}`),
    name: String(l.name || '無題のパターン'),
    rows: Number(l.rows) || 6,
    columns: Number(l.columns) || 7,
    seats: Array.isArray(l.seats) ? l.seats.map(Boolean) : new Array(42).fill(true),
    isDefault: Boolean(l.isDefault),
    frontRowStudents: Array.isArray(l.frontRowStudents)
      ? l.frontRowStudents.filter((n): n is number => typeof n === 'number' && !isNaN(n))
      : [],
  }
}

// --- 席替えアルゴリズム (クライアントサイド対応) ---
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array]
  const result: T[] = []
  while (copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy[idx])
    copy.splice(idx, 1)
  }
  return result
}

export function performShuffle(
  classmates: Classmate[],
  frontRowStudentNumbers: number[],
  activeLayout: SeatLayout
): SeatEntry[] {
  // 前2列の有効な座席数を算出
  let frontSeatsCount = 12
  if (activeLayout && activeLayout.seats) {
    const maxRowToCheck = Math.min(2, activeLayout.rows)
    let count = 0
    for (let r = 0; r < maxRowToCheck; r++) {
      for (let c = 0; c < activeLayout.columns; c++) {
        if (activeLayout.seats[r * activeLayout.columns + c]) {
          count++
        }
      }
    }
    if (count > 0) frontSeatsCount = count
  }

  if (frontRowStudentNumbers && frontRowStudentNumbers.length > 0) {
    const frontStudents = classmates.filter(s => frontRowStudentNumbers.includes(s.number))
    const otherStudents = classmates.filter(s => !frontRowStudentNumbers.includes(s.number))

    const shuffledFront = shuffleArray(frontStudents)
    const shuffledOther = shuffleArray(otherStudents)

    const targetFrontSeats = Math.min(frontSeatsCount, classmates.length)
    const frontSeats = [
      ...shuffledFront,
      ...shuffledOther.slice(0, Math.max(0, targetFrontSeats - shuffledFront.length)),
    ]
    const backSeats = shuffledOther.slice(Math.max(0, targetFrontSeats - shuffledFront.length))

    return [...shuffleArray(frontSeats), ...shuffleArray(backSeats)]
  } else {
    return shuffleArray(classmates)
  }
}

// --- 座席配置パターン (Layouts) API ---

export async function fetchSeatLayouts(): Promise<{
  layouts: SeatLayout[]
  activeLayoutId: string
  source: 'firestore' | 'netlify' | 'local'
}> {
  // 1. Firebase Firestore が設定されている場合
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        const layoutDocRef = doc(db, 'settings', 'layouts')
        const snap = await getDoc(layoutDocRef)
        if (snap.exists()) {
          const data = snap.data()
          if (Array.isArray(data.layouts) && data.layouts.length > 0) {
            const sanitized = data.layouts.map(sanitizeLayout)
            return {
              layouts: sanitized,
              activeLayoutId: data.activeLayoutId || sanitized[0].id,
              source: 'firestore',
            }
          }
        } else {
          // まだ保存されていない場合は初期値をセット
          const sanitizedDefaults = DEFAULT_LAYOUTS.map(sanitizeLayout)
          await setDoc(layoutDocRef, {
            layouts: sanitizedDefaults,
            activeLayoutId: sanitizedDefaults[0].id,
            updatedAt: new Date().toISOString(),
          })
          return {
            layouts: sanitizedDefaults,
            activeLayoutId: sanitizedDefaults[0].id,
            source: 'firestore',
          }
        }
      }
    } catch (err) {
      console.warn('Firestore からのレイアウト取得に失敗しました。フォールバックします:', err)
    }
  }

  // 2. localStorage フォールバック
  try {
    const savedLayouts = localStorage.getItem(LOCAL_STORAGE_LAYOUTS_KEY)
    const savedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_LAYOUT_KEY)
    if (savedLayouts) {
      const parsed = JSON.parse(savedLayouts)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = parsed.map(sanitizeLayout)
        return {
          layouts: sanitized,
          activeLayoutId: savedActiveId || sanitized[0].id,
          source: 'local',
        }
      }
    }
  } catch {
    // ignore
  }

  const defaultSanitized = DEFAULT_LAYOUTS.map(sanitizeLayout)
  return {
    layouts: defaultSanitized,
    activeLayoutId: defaultSanitized[0].id,
    source: 'local',
  }
}

export async function saveSeatLayouts(
  layouts: SeatLayout[],
  activeLayoutId: string
): Promise<{ success: boolean; firestore: boolean; error?: string }> {
  const sanitized = layouts.map(sanitizeLayout)

  // ローカル保存
  try {
    localStorage.setItem(LOCAL_STORAGE_LAYOUTS_KEY, JSON.stringify(sanitized))
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_LAYOUT_KEY, activeLayoutId)
  } catch (err) {
    console.warn('localStorage へのレイアウト保存エラー:', err)
  }

  let firestoreSaved = false
  let firestoreError: string | undefined

  // 1. Firebase Firestore に保存
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        const layoutDocRef = doc(db, 'settings', 'layouts')
        await setDoc(layoutDocRef, {
          layouts: sanitized,
          activeLayoutId,
          updatedAt: new Date().toISOString(),
        })
        firestoreSaved = true
      }
    } catch (err: unknown) {
      console.error('Firestore へのレイアウト保存エラー:', err)
      firestoreError = err instanceof Error ? err.message : String(err)
    }
  }

  return { success: true, firestore: firestoreSaved, error: firestoreError }
}

// --- 席データ (履歴 & 現在の座席) API ---

export async function fetchSeatHistory(): Promise<HistoryEntry[]> {
  // 1. Firebase Firestore 試行
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        const histCol = collection(db, 'seat_history')
        const q = query(histCol, orderBy('createdAt', 'desc'), limit(100))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const list: HistoryEntry[] = []
          snap.forEach(docSnap => {
            const data = docSnap.data()
            list.push({
              key: docSnap.id,
              seatMap: data.seatMap || [],
              createdAt: data.createdAt || new Date().toISOString(),
              action: data.action || 'save',
            })
          })
          return list
        }
      }
    } catch (err) {
      console.warn('Firestore からの履歴取得に失敗しました:', err)
    }
  }

  // 2. localStorage フォールバック
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }

  return []
}

export async function fetchCurrentSeat(): Promise<SeatEntry[] | null> {
  // 1. Firebase Firestore 試行
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        const snap = await getDoc(doc(db, 'settings', 'current_seat'))
        if (snap.exists()) {
          const data = snap.data()
          if (Array.isArray(data.seatMap) && data.seatMap.length > 0) {
            return data.seatMap
          }
        }
      }
    } catch (err) {
      console.warn('Firestore からの現在座席取得エラー:', err)
    }
  }

  // 2. localStorage フォールバック
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_CURRENT_SEAT_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }

  return null
}

export async function saveSeatData(
  seatMap: SeatEntry[],
  action: string = 'save'
): Promise<{ success: boolean; firestore: boolean; error?: string }> {
  const timestamp = new Date().toISOString()
  let firestoreSaved = false
  let firestoreError: string | undefined

  // ローカルにキャッシュ
  try {
    localStorage.setItem(LOCAL_STORAGE_CURRENT_SEAT_KEY, JSON.stringify(seatMap))

    const historyStr = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
    const historyList: HistoryEntry[] = historyStr ? JSON.parse(historyStr) : []
    const newEntry: HistoryEntry = {
      key: `local-${Date.now()}`,
      seatMap,
      createdAt: timestamp,
      action,
    }
    historyList.unshift(newEntry)
    if (historyList.length > 100) historyList.splice(100)
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(historyList))
  } catch {
    // ignore
  }

  // 1. Firebase Firestore 保存
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        // 現在の座席ドキュメント更新
        await setDoc(doc(db, 'settings', 'current_seat'), {
          seatMap,
          updatedAt: timestamp,
        })

        // 履歴コレクションに追加
        await addDoc(collection(db, 'seat_history'), {
          seatMap,
          createdAt: timestamp,
          action,
        })

        firestoreSaved = true
      }
    } catch (err: unknown) {
      console.error('Firestore への座席データ保存エラー:', err)
      firestoreError = err instanceof Error ? err.message : String(err)
    }
  }

  return { success: true, firestore: firestoreSaved, error: firestoreError }
}

// --- 設定 (生徒リスト・前列固定) API ---

export async function fetchSettingsData(): Promise<{
  classmates: Classmate[]
  frontRowStudents: number[]
  patternFrontRows: Record<string, number[]>
  source: 'firestore' | 'netlify' | 'local'
}> {
  // 1. Firebase Firestore 試行
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        const snap = await getDoc(doc(db, 'settings', 'classmates_settings'))
        if (snap.exists()) {
          const data = snap.data()
          const frontRow = Array.isArray(data.frontRowStudents) ? data.frontRowStudents : []
          const patternMap = (data.patternFrontRows && typeof data.patternFrontRows === 'object')
            ? data.patternFrontRows
            : {}

          return {
            classmates: Array.isArray(data.classmates) && data.classmates.length > 0
              ? data.classmates
              : defaultClassmates,
            frontRowStudents: frontRow,
            patternFrontRows: patternMap,
            source: 'firestore',
          }
        } else {
          // 初期ドキュメント作成
          await setDoc(doc(db, 'settings', 'classmates_settings'), {
            classmates: defaultClassmates,
            frontRowStudents: [],
            patternFrontRows: {},
            updatedAt: new Date().toISOString(),
          })
          return {
            classmates: defaultClassmates,
            frontRowStudents: [],
            patternFrontRows: {},
            source: 'firestore',
          }
        }
      }
    } catch (err) {
      console.warn('Firestore からの設定取得エラー:', err)
    }
  }

  // 2. ローカルフォールバック
  let localFrontRow: number[] = []
  let localPatternMap: Record<string, number[]> = {}
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_FRONT_ROW_KEY)
    if (stored) localFrontRow = JSON.parse(stored)
    const storedMap = localStorage.getItem(LOCAL_STORAGE_PATTERN_FRONT_ROWS_KEY)
    if (storedMap) localPatternMap = JSON.parse(storedMap)
  } catch {
    // ignore
  }

  return {
    classmates: defaultClassmates,
    frontRowStudents: localFrontRow,
    patternFrontRows: localPatternMap,
    source: 'local',
  }
}

export async function saveSettingsData(
  frontRowStudents: number[],
  patternFrontRows?: Record<string, number[]>
): Promise<{ success: boolean; firestore: boolean; error?: string }> {
  const cleanFrontRow = Array.isArray(frontRowStudents)
    ? frontRowStudents.filter((n): n is number => typeof n === 'number' && !isNaN(n))
    : []

  // ローカル保存
  try {
    localStorage.setItem(LOCAL_STORAGE_FRONT_ROW_KEY, JSON.stringify(cleanFrontRow))
    if (patternFrontRows) {
      localStorage.setItem(LOCAL_STORAGE_PATTERN_FRONT_ROWS_KEY, JSON.stringify(patternFrontRows))
    }
  } catch (err) {
    console.warn('localStorage への設定保存エラー:', err)
  }

  let firestoreSaved = false
  let firestoreError: string | undefined

  // 1. Firebase Firestore 保存
  if (isFirebaseConfigured()) {
    try {
      const db = getFirebaseDb()
      if (db) {
        const payload: Record<string, unknown> = {
          frontRowStudents: cleanFrontRow,
          updatedAt: new Date().toISOString(),
        }
        if (patternFrontRows && typeof patternFrontRows === 'object') {
          payload.patternFrontRows = patternFrontRows
        }
        await setDoc(
          doc(db, 'settings', 'classmates_settings'),
          payload,
          { merge: true }
        )
        firestoreSaved = true
      }
    } catch (err: unknown) {
      console.error('Firestore への設定保存エラー:', err)
      firestoreError = err instanceof Error ? err.message : String(err)
    }
  }

  return { success: true, firestore: firestoreSaved, error: firestoreError }
}

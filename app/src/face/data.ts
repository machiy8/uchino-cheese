// 書き出した顔の数値（app/tools/export_faces.py が art_tools から写したもの。手で直さない）
import facesJson from '../data/generated/faces.json'
import styleJson from '../data/generated/face_style.json'
import type { FaceStyle } from './types'

/** faces.json の1種ぶん（顔の型と位置。cx・cy＝顔の中心、w＝顔の幅。どれも体の絵の幅・高さに対する千分率） */
export interface SpeciesFace {
  name: string
  faceType: string
  cx: number
  cy: number
  w: number
  tilt?: number
  sulk?: string
  vintageArt?: boolean
  /** 位置を目で確かめた日 */
  checked?: string
}

export const faceStyle: FaceStyle = styleJson as unknown as FaceStyle
export const speciesFaces: Record<string, SpeciesFace> = facesJson.faces as Record<string, SpeciesFace>

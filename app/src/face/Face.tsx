// 顔を描く小さな部品。図形は shapes()、d 属性・不透明度・線の太さの書き方は svg.ts と同じ（to_svg と同じ見た目）
import { memo } from 'react'
import { faceStyle } from './data'
import { lineWidthFor, shapes } from './shapes'
import { fillOpacity, pathD, strokeWidth } from './svg'
import type { Expr, FaceItem, FaceStyle } from './types'

const SIZE = 1000
const C = SIZE / 2

function FacePaths({ items }: { items: FaceItem[] }) {
  return (
    <>
      {items.map((it, i) =>
        it.kind === 'fill' ? (
          <path key={i} d={pathD(it.path, C)} fill={it.color} fillOpacity={fillOpacity(it.alpha)} />
        ) : (
          <path
            key={i}
            d={pathD(it.path, C)}
            fill="none"
            stroke={it.color}
            strokeWidth={strokeWidth(it.width)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
    </>
  )
}

interface FaceProps {
  faceType: string
  expr: Expr
  /** 顔の幅（faces.json の w・体の絵の幅に対する千分率）。線の太さを体の主線に合わせる */
  faceW: number
  style?: FaceStyle
}

/** 顔だけの SVG（viewBox 0 0 1000 1000・顔の中心＝(500,500)） */
export const FaceSvg = memo(function FaceSvg({
  faceType,
  expr,
  faceW,
  style = faceStyle,
  className,
}: FaceProps & { className?: string }) {
  const items = shapes(faceType, expr, style, lineWidthFor(style, faceW))
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      data-type={faceType}
      data-expr={expr}
    >
      <FacePaths items={items} />
    </svg>
  )
})

/**
 * 体の絵と同じ SVG の中に置く顔（<g>）。座標は体の絵の viewBox（幅 width・高さ height）
 * 置き方は faces.json の cx・cy・w・tilt（facePlacement）
 */
export const FaceGroup = memo(function FaceGroup({
  faceType,
  expr,
  faceW,
  style = faceStyle,
  cx,
  cy,
  tilt = 0,
  width,
  height,
}: FaceProps & { cx: number; cy: number; tilt?: number; width: number; height: number }) {
  const items = shapes(faceType, expr, style, lineWidthFor(style, faceW))
  return (
    <g transform={facePlacement({ cx, cy, w: faceW, tilt }, width, height)} data-type={faceType} data-expr={expr}>
      <FacePaths items={items} />
    </g>
  )
})

/**
 * 顔の座標（to_svg と同じ 0〜1000・中心 500）を体の絵の座標へ移す transform。
 * cx・cy は体の絵の幅・高さ、w は幅に対する千分率。tilt は度（face_preview.py と同じく画面で時計回りが＋）
 */
export function facePlacement(
  f: { cx: number; cy: number; w: number; tilt?: number },
  width: number,
  height: number,
): string {
  const x = (f.cx * width) / 1000
  const y = (f.cy * height) / 1000
  const k = (f.w * width) / 1000 / SIZE
  const rot = f.tilt ? ` rotate(${f.tilt})` : ''
  return `translate(${x} ${y})${rot} scale(${k}) translate(${-C} ${-C})`
}

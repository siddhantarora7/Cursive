import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

/*
 * The pixel ground plane the page ends on.
 *
 * Authored as string art maps compiled to run-merged <rect> elements: one rect
 * per horizontal run of a colour rather than one per pixel, which takes the
 * scene from a few thousand nodes to a few hundred. Rows may be ragged; short
 * rows are treated as transparent to the right, so editing the art does not
 * mean counting characters.
 *
 * Three depth layers move at different rates as the section arrives. The lamp
 * pulses, the figure's hands run a two-frame loop, and the stars twinkle on
 * offset cycles. All of it stops flat under reduced motion.
 *
 * The figure wears the brand blue. It is the only place on the page where a
 * person appears, and it is the last thing you see before the footer.
 */

const P = {
  ground: '#8C6B4A',
  groundDark: '#7A5C3E',
  groundLight: '#9C7A57',
  desk: '#9B7550',
  deskDark: '#7E5D3E',
  skin: '#E8C4A0',
  hair: '#2A2320',
  shirt: '#2B3A67',
  laptop: '#C9C4B2',
  laptopDark: '#A29C8A',
  metal: '#4A4238',
  glow: '#F2D9A0',
  night: '#232B3D',
  star: '#FDFCF0',
  leaf: '#5B7A52',
  leafDark: '#48633F',
  pot: '#B5754A',
  red: '#C8492E',
  blue: '#2B3A67',
  paper: '#E4E1D2',
} as const

type Legend = Record<string, string>

/** Compile ragged string rows into run-merged rects. */
function compile(rows: string[], legend: Legend) {
  const out: { x: number; y: number; w: number; fill: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      const fill = ch ? legend[ch] : undefined
      if (!fill) {
        x += 1
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w += 1
      out.push({ x, y, w, fill })
      x += w
    }
  })
  return out
}

function Art({
  rows,
  legend,
  x = 0,
  y = 0,
  className,
}: {
  rows: string[]
  legend: Legend
  x?: number
  y?: number
  className?: string
}) {
  const rects = compile(rows, legend)
  return (
    <g transform={`translate(${x},${y})`} className={className}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </g>
  )
}

/* ------------------------------------------------------------------ art --- */

/*
 * Layout contract for everything below: the world is 320 x 96 units and the
 * floor line is y = 70. Every object's art is authored so its last row lands
 * on that line, and each is placed at `y = 70 - height`. Getting this wrong is
 * how furniture ends up floating, so the arithmetic is written out at each
 * placement rather than eyeballed.
 */
const FLOOR = 70

const WINDOW_LEGEND: Legend = { F: P.metal, N: P.night }
const WINDOW = [
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FNNNNNNNNNNNNNNFFNNNNNNNNNNNNNNF',
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
]

/** Star positions inside the window, in window-local coordinates. */
const STARS = [
  { x: 5, y: 2, d: 0 },
  { x: 11, y: 5, d: 1.1 },
  { x: 22, y: 3, d: 2.3 },
  { x: 28, y: 6, d: 0.7 },
  { x: 3, y: 12, d: 1.8 },
  { x: 20, y: 14, d: 3.1 },
  { x: 26, y: 11, d: 2.6 },
  { x: 8, y: 10, d: 1.4 },
  { x: 13, y: 13, d: 0.4 },
  { x: 30, y: 15, d: 2.9 },
]

const FIGURE_LEGEND: Legend = {
  H: P.hair,
  T: P.metal,
  S: P.skin,
  E: P.hair,
  B: P.shirt,
  L: P.laptop,
  l: P.laptopDark,
  D: P.desk,
  d: P.deskDark,
}

/*
 * Desk, figure and laptop. 50 wide, 30 tall. The desk top is row 15 and the
 * desk's own legs run to the last row, so placing this at y = 40 lands it
 * exactly on the floor. The figure's head sits at columns 21-26, the middle of
 * the desk; the lamp goes on the right-hand end.
 *
 * The figure's legs and shoes are drawn in the gap between the desk legs. A
 * seated figure cropped at the desk edge reads as a bust on a plinth, not as
 * somebody sitting down.
 */
const DESK = [
  '.....................HHHHHH',
  '....................HHHHHHHH',
  '....................HSSSSSSH',
  '....................HSESSESH',
  '....................HSSSSSSH',
  '.....................SSSSSS',
  '.....................SSSSSS',
  '.................BBBBBBBBBBBB',
  '................BBBBBBBBBBBBBB',
  '...............BBBBBBBBBBBBBBBB',
  '...............BBBBBBBBBBBBBBBB',
  '...............BBBBBBBBBBBBBBBB',
  '................LLLLLLLLLLLLLL',
  '................LLLLLLLLLLLLLL',
  '...............llllllllllllllll',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  'dddddddddddddddddddddddddddddddddddddddddddddddddd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd               TTTT TTTT                  dd',
  '..dd              HHHHH HHHHH                 dd',
  '..dd              HHHHH HHHHH                 dd',
]

/* Two hand frames, drawn over the laptop lip. Toggling between them is the
   whole typing animation; nothing else about the figure moves. */
const HANDS_LEGEND: Legend = { S: P.skin }
const HANDS_A = ['..SS......SS']
const HANDS_B = ['.SS........SS']

/* Desk lamp, 10 tall, base on the desk surface. */
const LAMP_LEGEND: Legend = { M: P.metal, g: P.glow }
const LAMP = [
  '..MMMMM',
  '.MMMMMMM',
  '.MMMMMMM',
  '..ggggg',
  '....M',
  '....M',
  '....M',
  '....M',
  '...MMM',
  '..MMMMM',
]

const PLANT_LEGEND: Legend = { V: P.leaf, v: P.leafDark, P: P.pot }
const PLANT = [
  '....V',
  '...VVV.V',
  '.V.VVVVVV',
  '.VVvvVVVV',
  '..VVVVVV',
  '...VvVV',
  '....VV',
  '....VV',
  '..PPPPPP',
  '..PPPPPP',
  '..PPPPPP',
  '...PPPP',
]

const BOOKS_LEGEND: Legend = { R: P.red, U: P.blue, C: P.paper }
const BOOKS = [
  '..RRRRRRRRR',
  '..RRRRRRRRR',
  '.UUUUUUUUUUU',
  '.UUUUUUUUUUU',
  'CCCCCCCCCCCCC',
  'CCCCCCCCCCCCC',
]

/* A filled shelf gives the left of the room something to be. 26 x 26. */
const SHELF_LEGEND: Legend = {
  W: P.deskDark,
  w: P.desk,
  R: P.red,
  U: P.blue,
  C: P.paper,
  V: P.leaf,
}
const SHELF = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W..RRUUCC..RR.UUCCRR..UU.W',
  'W..RRUUCC..RR.UUCCRR..UU.W',
  'W..RRUUCC..RR.UUCCRR..UU.W',
  'W..RRUUCC..RR.UUCCRR..UU.W',
  'W..RRUUCC..RR.UUCCRR..UU.W',
  'wwwwwwwwwwwwwwwwwwwwwwwwww',
  'W....VV...CCUURR..UUCC...W',
  'W...VVVV..CCUURR..UUCC...W',
  'W....VV...CCUURR..UUCC...W',
  'W....VV...CCUURR..UUCC...W',
  'W...RRRR..CCUURR..UUCC...W',
  'wwwwwwwwwwwwwwwwwwwwwwwwww',
  'W..UUCCRR....RRUU..CCUU..W',
  'W..UUCCRR....RRUU..CCUU..W',
  'W..UUCCRR....RRUU..CCUU..W',
  'W..UUCCRR....RRUU..CCUU..W',
  'W..UUCCRR....RRUU..CCUU..W',
  'wwwwwwwwwwwwwwwwwwwwwwwwww',
  'W...CC..RRUU..CC..RRUU...W',
  'W...CC..RRUU..CC..RRUU...W',
  'W...CC..RRUU..CC..RRUU...W',
  'W...CC..RRUU..CC..RRUU...W',
  'W...CC..RRUU..CC..RRUU...W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W........................W',
]

/* Side table with a mug, 22 x 18, legs to the floor. */
const TABLE_LEGEND: Legend = { T: P.desk, t: P.deskDark, C: P.paper, m: P.red }
const TABLE = [
  '......CCCC',
  '.....CCCCCm',
  '.....CCCCCm',
  '.....CCCCC',
  'TTTTTTTTTTTTTTTTTTTTTT',
  'tttttttttttttttttttttt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
  '.tt................tt',
]

const ART_LEGEND: Legend = {
  F: P.metal,
  C: P.paper,
  U: P.blue,
  R: P.red,
  o: P.glow,
}

/* A framed print: sun over hills. */
const POSTER = [
  'FFFFFFFFFFFFFFFFFFFF',
  'FCCCCCCCCCCCCCCCCCCF',
  'FCCCCCCCCoooCCCCCCCF',
  'FCCCCCCCoooooCCCCCCF',
  'FCCCCCCCCoooCCCCCCCF',
  'FCCCCCCCCCCCCCCCCCCF',
  'FCCCCCCCCCCCCCCCCCCF',
  'FCCCUUCCCCCCCCUUUCCF',
  'FCCUUUUCCCCCUUUUUUCF',
  'FCUUUUUUUCCUUUUUUUUF',
  'FUUUUUUUUUUUUUUUUUUF',
  'FUUUUUUUUUUUUUUUUUUF',
  'FFFFFFFFFFFFFFFFFFFF',
]

/* A smaller print, hung above the shelf. */
const SMALL_ART = [
  'FFFFFFFFFFFFFF',
  'FCCCCCCCCCCCCF',
  'FCCCUUCCCCCCCF',
  'FCCUUUUCCCCCCF',
  'FCUUUUUUCCCCCF',
  'FCCCCCCCCCRRCF',
  'FCCCCCCCCRRRRF',
  'FCCCCCCCCCRRCF',
  'FCCCCCCCCCCCCF',
  'FFFFFFFFFFFFFF',
]

const CLOCK_LEGEND: Legend = { F: P.metal, C: P.paper, M: P.hair }
const CLOCK = [
  '...FFFFF',
  '..FCCCCCF',
  '.FCCCCCCCF',
  'FCCCCMCCCCF',
  'FCCCCMCCCCF',
  'FCCCCMMMCCF',
  'FCCCCCCCCCF',
  '.FCCCCCCCF',
  '..FCCCCCF',
  '...FFFFF',
]

const PENDANT_LEGEND: Legend = { M: P.metal, g: P.glow }
const PENDANT = [
  '....M',
  '....M',
  '....M',
  '....M',
  '....M',
  '....M',
  '....M',
  '....M',
  '....M',
  '..MMMMM',
  '.MMMMMMM',
  '..ggggg',
]

/* --------------------------------------------------------------- scene --- */

/*
 * The scene crops rather than scales on narrow screens.
 *
 * Fitting all 320 units into a phone puts the whole room at roughly one pixel
 * per art unit, where the figure stops being a figure. Narrowing the viewBox
 * instead frames the desk and the light, which is the part worth seeing, and
 * everything keeps its real size.
 */
function useViewBox() {
  const [box, setBox] = useState('0 0 320 96')

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 900px)')
    const mid = window.matchMedia('(min-width: 600px)')
    const pick = () =>
      // The narrow crop starts past the window, which ends at x=102, so the
    // frame does not open on a sliver of it.
    setBox(wide.matches ? '0 0 320 96' : mid.matches ? '40 0 250 96' : '106 4 132 92')
    pick()
    wide.addEventListener('change', pick)
    mid.addEventListener('change', pick)
    return () => {
      wide.removeEventListener('change', pick)
      mid.removeEventListener('change', pick)
    }
  }, [])

  return box
}

export function PixelScene() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const viewBox = useViewBox()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end end'],
  })

  // Depth: the far layer barely moves, the near layer moves most.
  const farY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [10, 0])
  const midY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [22, 0])
  const nearY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [34, 0])

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={viewBox}
        className="block h-auto w-full"
        style={{ shapeRendering: 'crispEdges' }}
        role="img"
      >
        {/* This scene is content, not decoration, so it keeps an accessible
            name rather than being hidden. */}
        <title>
          Someone typing at a lamplit desk at night, a window of stars behind
          them and a stack of books on the floor.
        </title>

        {/* far: the ceiling, its pendants, and what is on the wall */}
        <motion.g style={{ y: farY }}>
          {/* The pendants used to hang from nothing. */}
          <rect x={0} y={0} width={320} height={2} fill={P.metal} />
          <rect x={0} y={2} width={320} height={1} fill={P.hair} opacity={0.5} />

          {[62, 168, 258].map((x) => (
            <Art key={x} rows={PENDANT} legend={PENDANT_LEGEND} x={x} y={3} />
          ))}

          <Art rows={SMALL_ART} legend={ART_LEGEND} x={30} y={22} />
          <Art rows={CLOCK} legend={CLOCK_LEGEND} x={140} y={17} />
          <Art rows={POSTER} legend={ART_LEGEND} x={212} y={19} />
          <Art rows={WINDOW} legend={WINDOW_LEGEND} x={70} y={18} />
          <g transform="translate(70,18)">
            {STARS.map((s) => (
              <rect
                key={`${s.x}-${s.y}`}
                x={s.x}
                y={s.y}
                width={1}
                height={1}
                fill={P.star}
                opacity={0.9}
              >
                {!reduced && (
                  <animate
                    attributeName="opacity"
                    values="0.9;0.25;0.9"
                    dur="3.6s"
                    begin={`${s.d}s`}
                    repeatCount="indefinite"
                  />
                )}
              </rect>
            ))}
          </g>
        </motion.g>

        {/* mid: the shelf, the desk, the figure, the lamp and its light */}
        <motion.g style={{ y: midY }}>
          {/* Shelf: 26 tall, so it starts 26 above the floor. */}
          <Art rows={SHELF} legend={SHELF_LEGEND} x={16} y={FLOOR - 26} />

          {/* Desk: 30 tall, legs land exactly on the floor. */}
          <Art rows={DESK} legend={FIGURE_LEGEND} x={118} y={FLOOR - 30} />

          {/* Lamp: 10 tall, standing on the desk top, which is 15 rows down
              from the desk's origin. */}
          <Art rows={LAMP} legend={LAMP_LEGEND} x={158} y={FLOOR - 30 + 15 - 10} />

          {/* Light cone, widening from under the shade down onto the desk. */}
          <g opacity={0.55}>
            {!reduced && (
              <animate
                attributeName="opacity"
                values="0.55;0.38;0.55"
                dur="4.2s"
                repeatCount="indefinite"
              />
            )}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={i}
                x={160 - i * 1.5}
                y={FLOOR - 30 + 9 + i}
                width={7 + i * 3}
                height={1}
                fill={P.glow}
                opacity={0.3 - i * 0.04}
              />
            ))}
          </g>

          {/* Two-frame hands, over the laptop lip. A discrete opacity swap is
              a hard cut, which is what pixel animation should look like. Under
              reduced motion frame A simply stays put. */}
          <g transform={`translate(134,${FLOOR - 30 + 14})`}>
            <g>
              {!reduced && (
                <animate
                  attributeName="opacity"
                  values="1;0"
                  keyTimes="0;0.5"
                  dur="0.44s"
                  repeatCount="indefinite"
                  calcMode="discrete"
                />
              )}
              <Art rows={HANDS_A} legend={HANDS_LEGEND} />
            </g>
            <g opacity={0}>
              {!reduced && (
                <animate
                  attributeName="opacity"
                  values="0;1"
                  keyTimes="0;0.5"
                  dur="0.44s"
                  repeatCount="indefinite"
                  calcMode="discrete"
                />
              )}
              <Art rows={HANDS_B} legend={HANDS_LEGEND} />
            </g>
          </g>
        </motion.g>

        {/* near: the side table, the floor, and what sits on it */}
        <motion.g style={{ y: nearY }}>
          {/* Table: 18 tall including the mug that overhangs its top. */}
          <Art rows={TABLE} legend={TABLE_LEGEND} x={196} y={FLOOR - 18} />
          {/* Books: 6 tall, stacked on the floor. */}
          <Art rows={BOOKS} legend={BOOKS_LEGEND} x={92} y={FLOOR - 6} />
          {/* Plant: 12 tall. */}
          <Art rows={PLANT} legend={PLANT_LEGEND} x={272} y={FLOOR - 12} />

          <rect x={0} y={FLOOR} width={320} height={96 - FLOOR} fill={P.ground} />
          <rect x={0} y={FLOOR} width={320} height={1} fill={P.groundLight} />
          <rect x={0} y={FLOOR + 1} width={320} height={1} fill={P.groundDark} />
          {/* A little floor grain so the plane is not a flat slab. */}
          {[14, 58, 96, 140, 188, 232, 276, 304].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={FLOOR + 6 + (i % 3) * 6}
              width={6 + (i % 4) * 3}
              height={1}
              fill={P.groundDark}
              opacity={0.5}
            />
          ))}
        </motion.g>
      </svg>
    </div>
  )
}

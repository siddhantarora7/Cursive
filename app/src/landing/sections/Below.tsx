import { GhostDemo } from './GhostDemo'
import { TwoUp } from './TwoUp'
import { Manifesto } from './Manifesto'
import { ThreeKeys } from './ThreeKeys'
import { Themes } from './Themes'
import { ThreeUp } from './ThreeUp'
import { Trust } from './Trust'
import { Compare } from './Compare'
import { Faq } from './Faq'
import { Plans } from './Plans'
import { Finale } from './Finale'

/*
 * Everything below the fold, in one lazy chunk.
 *
 * The order is the argument: show the mechanism working, name the two things
 * it does, say why it matters at all, show how little there is to learn, show
 * the room you do it in, cover the smaller craft, then answer the two
 * questions anyone still has (where do my words go, how does it compare, what
 * does it cost, and the six things people actually ask) before asking for
 * anything.
 */
export default function Below() {
  return (
    <>
      <GhostDemo />
      <TwoUp />
      <Manifesto />
      <ThreeKeys />
      <Themes />
      <ThreeUp />
      <Trust />
      <Compare />
      <Plans />
      <Faq />
      <Finale />
    </>
  )
}

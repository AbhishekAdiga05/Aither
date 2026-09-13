import { ModeToggle } from '@/components/ui/mode-toggle'

const Header = () => {
  return (
    <div className="flex h-14 w-full flex-row items-center justify-end border-b border-border/50 bg-background/70 px-4 backdrop-blur-md z-10 relative">
      <ModeToggle />
    </div>
  )
}

export default Header
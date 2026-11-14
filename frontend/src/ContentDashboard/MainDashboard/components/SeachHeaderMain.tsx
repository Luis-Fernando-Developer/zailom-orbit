import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'

export default function SeachHeaderMain() {
  return (
    <Card className='w-full border border-green-400'>
      <div className='flex rounded-2xl bg-transparent items-center justify-center'>
        <input className='w-full text-white px-2 flex items-center justify-center text-left' placeholder='Pesquisar' />
        <Search className='relative right-[-1.5px] text-white w-11.25 h-7.5 bg-green-600 px-2 rounded-r-xl' />
      </div>
    </Card>
  )
}

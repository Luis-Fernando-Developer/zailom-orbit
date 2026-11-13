import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'
import React from 'react'

export default function SeachHeaderMain() {
  return (
    <Card className='w-full border border-green-400'>
      <div className='flex rounded-2xl bg-transparent items-center justify-center'>
        <input className='flex w-full text-white px-2 flex items-center justify-center text-left' placeholder='Pesquisar' />
        <Search className='relative -right-[1.5px] text-white w-[45px] h-[30px] bg-green-600 px-2 rounded-r-xl' />
      </div>
    </Card>
  )
}

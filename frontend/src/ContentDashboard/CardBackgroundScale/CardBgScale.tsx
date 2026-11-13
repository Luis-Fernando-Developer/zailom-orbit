// @refresh reset

import MainDashboard from "../MainDashboard/MainDashboard";
import SidebarDashboard from "../SidebarDashboard/SidebarDashboard";

// import React from 'react'

interface CardBgScaleProps {
  className?: string;
  onSignOut: () => void;
}

export default function CardBgScale({ className, onSignOut }: CardBgScaleProps) {
  return (
    <div className={`flex h-full min-h-0 w-full p-4 ${className ?? ''}`}>
      <div className="group-content-main flex h-full min-h-0 w-full gap-5 p-0">
        <div className="h-full min-h-0 shrink-0">
          <SidebarDashboard onSignOut={onSignOut} />
        </div>
        <MainDashboard />
      </div>
    </div>
  )
}

'use client'


import { useEffect, useState } from 'react'


export function useRequireAdmin(getRole: () => string | undefined) {
const [ok, setOk] = useState(false)
useEffect(() => {
const r = getRole()
if (r === 'admin') setOk(true)
else {
// Client-side guard: fallback redirect
window.location.href = '/login'
}
}, [])
return ok
}
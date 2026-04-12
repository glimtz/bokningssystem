import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BookingApp from './BookingApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BookingApp />
  </StrictMode>,
)

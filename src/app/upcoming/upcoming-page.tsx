import { redirect } from 'next/navigation'

/**
 * /upcoming has been removed. Upcoming Releases now lives on the home page
 * as a MovieZone-style grid section.
 */
export default function UpcomingPage() {
  redirect('/')
}

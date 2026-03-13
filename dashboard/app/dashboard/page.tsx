// Redirect to overview by default
import { redirect } from 'next/navigation';
export default function DashboardIndex() {
    redirect('/dashboard/overview');
}

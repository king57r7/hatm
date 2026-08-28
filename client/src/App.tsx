import { Switch, Route, Router as WouterRouter } from 'wouter';
import { AuthProvider, LangProvider, SiteProvider } from './lib/context';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import DashboardHome from './pages/dashboard/index';
import ServicesPage from './pages/dashboard/services';
import SectionServicesPage from './pages/dashboard/section-services';
import OrdersPage from './pages/dashboard/orders';
import WalletPage from './pages/dashboard/wallet';
import ProfilePage from './pages/dashboard/profile';
import AdminDashboard from './pages/admin/index';
import AdminUsersPage from './pages/admin/users';
import AdminServicesPage from './pages/admin/services';
import AdminOrdersPage from './pages/admin/orders';
import AdminTopupsPage from './pages/admin/topups';
import AnalyticsPage from './pages/admin/analytics';
import AdminSettingsPage from './pages/admin/settings';
import AdminProvidersPage from './pages/admin/providers';
import AdminSectionsPage from './pages/admin/sections';
import AdminHomeContentPage from './pages/admin/home-content';

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardHome} />
        <Route path="/dashboard/services/section/:id" component={SectionServicesPage} />
        <Route path="/dashboard/services" component={ServicesPage} />
        <Route path="/dashboard/orders" component={OrdersPage} />
        <Route path="/dashboard/wallet" component={WalletPage} />
        <Route path="/dashboard/profile" component={ProfilePage} />
      </Switch>
    </DashboardLayout>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/providers" component={AdminProvidersPage} />
        <Route path="/admin/sections" component={AdminSectionsPage} />
        <Route path="/admin/home-content" component={AdminHomeContentPage} />
        <Route path="/admin/services" component={AdminServicesPage} />
        <Route path="/admin/orders" component={AdminOrdersPage} />
        <Route path="/admin/topups" component={AdminTopupsPage} />
        <Route path="/admin/analytics" component={AnalyticsPage} />
        <Route path="/admin/settings" component={AdminSettingsPage} />
      </Switch>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <SiteProvider>
      <LangProvider>
        <AuthProvider>
          <WouterRouter>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/dashboard" component={DashboardRoutes} />
              <Route path="/dashboard/:rest*" component={DashboardRoutes} />
              <Route path="/admin" component={AdminRoutes} />
              <Route path="/admin/:rest*" component={AdminRoutes} />
              <Route path="/">{() => { window.location.replace('/login'); return null; }}</Route>
            </Switch>
          </WouterRouter>
        </AuthProvider>
      </LangProvider>
    </SiteProvider>
  );
}

import React from 'react';
import { ChevronRight } from 'lucide-react';

const Breadcrumb = ({ activeSection, activeTab, viewMode, selectedDate, selectedWeek, availableDates }) => {
  const getBreadcrumbItems = () => {
    const items = [];

    // Add section-specific breadcrumbs
    switch (activeSection) {
      case 'administration':
        items.push({ label: 'Dashboard', href: '#' });
        
        if (activeTab === 'dashboard') {
          items.push({ label: 'Admin Dashboard', href: '#' });
          
          // Add view-specific breadcrumb
          if (viewMode === 'week') {
            items.push({ 
              label: `Week ${(selectedWeek || 0) + 1}`, 
              href: '#',
              isActive: true 
            });
          } else if (selectedDate) {
            const dateLabel = selectedDate === 'today' ? 
              'Latest' : 
              new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            items.push({ 
              label: dateLabel, 
              href: '#',
              isActive: true 
            });
          }
        } else if (activeTab === 'hardware') {
          items.push({ label: 'Hardware Management', href: '#', isActive: true });
        } else if (activeTab) {
          items.push({ label: getTabDisplayName(activeTab), href: '#', isActive: true });
        }
        break;
        
      case 'greenmatrix':
        items.push({ label: 'GreenMatrix', href: '#' });
        
        if (activeTab) {
          const tabDisplayName = getGreenMatrixTabName(activeTab);
          items.push({ label: tabDisplayName, href: '#', isActive: true });
        }
        break;
        
      default:
        items.push({ label: 'HPE Analytics', href: '#', isActive: true });
        break;
    }

    return items;
  };

  const getTabDisplayName = (tabId) => {
    const tabNames = {
      'dashboard': 'Admin Dashboard',
      'hardware': 'Hardware Management',
      'users': 'Users & Teams',
      'data-sources-admin': 'Data Sources',
      'plugins': 'Plugins'
    };
    return tabNames[tabId] || tabId;
  };

  const getGreenMatrixTabName = (tabId) => {
    const tabNames = {
      'simulate': 'Simulate Performance',
      'optimize': 'Optimize Hardware',
      'model': 'Model Optimizer'
    };
    return tabNames[tabId] || tabId;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center">
            {item.icon && (
              <item.icon size={16} className="mr-1" />
            )}
            <button
              className={`hover:text-gray-900 dark:hover:text-white transition-colors ${
                item.isActive ? 'text-gray-900 dark:text-white font-medium' : ''
              }`}
            >
              {item.label}
            </button>
          </div>
          {index < breadcrumbItems.length - 1 && (
            <ChevronRight size={16} className="text-gray-400" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
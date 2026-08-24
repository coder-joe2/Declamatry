import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Filter,
  User,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Building2,
  BookOpen,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { UserProfile, RegisteredMember } from '../../types';
import { subscribeToRegisteredMembers, fetchAllRegisteredMembers, deleteMemberByAdmin } from '../../firebase';
import { SocietyLogo } from '../SocietyLogo';

interface MembersListTabProps {
  userProfile: UserProfile;
  onEditProfile?: () => void;
}

// Helper to categorize years accurately without substring overlaps
const normalizeYearCategory = (yearStr?: string): '1' | '2' | '3' | 'other' => {
  if (!yearStr) return 'other';
  const clean = yearStr.trim().toLowerCase();

  // 3rd year check
  if (clean === 'iii year' || clean === '3rd year' || clean === '3' || clean === 'iii' || clean.includes('3rd') || clean.startsWith('iii')) {
    return '3';
  }
  // 2nd year check
  if (clean === 'ii year' || clean === '2nd year' || clean === '2' || clean === 'ii' || clean.includes('2nd') || clean.startsWith('ii')) {
    return '2';
  }
  // 1st year check (strictly checking so II and III are excluded)
  if (clean === 'i year' || clean === '1st year' || clean === '1' || clean === 'i' || clean.includes('1st') || clean.startsWith('i ')) {
    return '1';
  }
  return 'other';
};

export const MembersListTab: React.FC<MembersListTabProps> = ({ userProfile }) => {
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'dept' | 'year'>('recent');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedMemberModal, setSelectedMemberModal] = useState<RegisteredMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<RegisteredMember | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const isAdmin = userProfile.isAdmin || userProfile.gmail?.toLowerCase() === 'vjana537@gmail.com';

  // Load members from Firebase with real-time listener
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToRegisteredMembers((data) => {
      setMembers(data);
      setIsLoading(false);
    });

    // Fallback one-time fetch
    fetchAllRegisteredMembers().then((res) => {
      if (res && res.length > 0) {
        setMembers(res);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    const data = await fetchAllRegisteredMembers();
    setMembers(data);
    setIsLoading(false);
  };

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete?.id) return;
    setIsDeleting(true);
    const res = await deleteMemberByAdmin(memberToDelete.id);
    setIsDeleting(false);
    if (res.success) {
      setDeleteSuccessMsg(`Member ${memberToDelete.name} removed successfully.`);
      setMemberToDelete(null);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      if (selectedMemberModal?.id === memberToDelete.id) {
        setSelectedMemberModal(null);
      }
      setTimeout(() => setDeleteSuccessMsg(null), 3000);
    } else {
      alert(`Error deleting member: ${res.error || 'Please try again.'}`);
    }
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    if (members.length === 0) {
      alert('No members data available to export.');
      return;
    }

    const headers = [
      'S.No',
      'Full Name',
      'Gmail / Email',
      'Phone Number',
      'Academic Year',
      'Department / Degree',
      'Class / Specialization',
      'Admin Role',
      'Password',
      'Registered Date',
    ];

    const rows = filteredMembers.map((m, index) => [
      index + 1,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${(m.gmail || '').replace(/"/g, '""')}"`,
      `"${(m.phone || '').replace(/"/g, '""')}"`,
      `"${(m.year || '').replace(/"/g, '""')}"`,
      `"${(m.department || '').replace(/"/g, '""')}"`,
      `"${(m.className || '').replace(/"/g, '""')}"`,
      m.isAdmin ? 'Admin' : 'Member',
      `"${(m.password || '').replace(/"/g, '""')}"`,
      `"${m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Declamates_Society_Members_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract distinct departments, years, and classes
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [members]);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.year) set.add(m.year);
    });
    return Array.from(set).sort();
  }, [members]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.className && m.className.trim()) set.add(m.className.trim());
    });
    return Array.from(set).sort();
  }, [members]);

  // Active filters count
  const activeFilterCount =
    (selectedYear !== 'ALL' ? 1 : 0) +
    (selectedDept !== 'ALL' ? 1 : 0) +
    (selectedClass !== 'ALL' ? 1 : 0);

  // Filtered & Sorted Members
  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        const matchesSearch =
          !searchQuery.trim() ||
          member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.gmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.phone?.includes(searchQuery) ||
          member.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.className?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesDept = selectedDept === 'ALL' || member.department === selectedDept;

        // Year Matching helper (1st Year, 2nd Year, 3rd Year or direct value)
        let matchesYear = selectedYear === 'ALL';
        if (!matchesYear) {
          const memberCat = normalizeYearCategory(member.year);
          if (selectedYear === '1st Year') {
            matchesYear = memberCat === '1';
          } else if (selectedYear === '2nd Year') {
            matchesYear = memberCat === '2';
          } else if (selectedYear === '3rd Year') {
            matchesYear = memberCat === '3';
          } else {
            matchesYear = member.year === selectedYear;
          }
        }

        const matchesClass = selectedClass === 'ALL' || member.className === selectedClass;

        return matchesSearch && matchesDept && matchesYear && matchesClass;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'dept') {
          return (a.department || '').localeCompare(b.department || '');
        }
        if (sortBy === 'year') {
          return (a.year || '').localeCompare(b.year || '');
        }
        // default recent
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [members, searchQuery, selectedDept, selectedYear, selectedClass, sortBy]);

  // Department counts breakdown
  const deptBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => {
      const d = m.department || 'Unassigned';
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [members]);

  if (!isAdmin) {
    return (
      <div className="min-h-[300px] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-5 sm:p-6 rounded-2xl bg-[#0B1528] border border-[#1E2E48] text-center space-y-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-cinzel text-lg font-bold text-white tracking-wide">
            Administrator Access Only
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            The Members List registry is strictly confidential and reserved for Declamate&apos;s Society Administrators.
          </p>
          <div className="pt-2 text-[11px] text-slate-400 font-mono">
            Signed in as: <span className="text-[#C5A880]">{userProfile.gmail || 'Guest'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 text-slate-100 max-w-full">
      {/* Top Header Banner - Stats & Actions Only */}
      <div className="rounded-2xl bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] text-white p-3.5 sm:p-5 border border-[#C5A880]/40 shadow-xl relative overflow-hidden space-y-3.5">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl bg-[#030712]/90 border border-[#1E2E48] text-center shadow-inner">
            <span className="text-xl sm:text-3xl font-bold font-cinzel text-[#C5A880] block leading-tight">
              {members.length}
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-300 font-semibold font-cinzel">
              TOTAL MEMBERS
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-[#030712]/90 border border-[#1E2E48] text-center shadow-inner">
            <span className="text-xl sm:text-3xl font-bold font-cinzel text-emerald-400 block leading-tight">
              {departmentOptions.length}
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-300 font-semibold font-cinzel">
              DEPARTMENTS
            </span>
          </div>
        </div>

        {/* Live status badge & Actions */}
        <div className="pt-3 border-t border-[#1E2E48]/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 text-[11px] sm:text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Firebase Synced</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 truncate">Karur Campus</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1E38] hover:bg-[#152B4D] border border-[#1E2E48] hover:border-[#C5A880]/50 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Download CSV file"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-[#0E1E38] hover:bg-[#152B4D] border border-[#1E2E48] hover:border-[#C5A880]/50 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              title="Refresh member data"
            >
              <RefreshCw className={`w-4 h-4 text-[#C5A880] ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Feedback Toast */}
      {deleteSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{deleteSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessMsg(null)}
            className="text-xs text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Bar & Filter Section */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1528] border border-[#1E2E48] shadow-lg space-y-3">
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by member name, phone, department, branch, email..."
            className="w-full bg-[#030712] border border-[#1E2E48] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-lg pl-9.5 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white p-1"
              title="Clear Search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toggle Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isFilterOpen || activeFilterCount > 0
                ? 'bg-[#C5A880]/20 border-[#C5A880] text-[#C5A880]'
                : 'bg-[#030712] border-[#1E2E48] text-slate-300 hover:text-white hover:border-slate-500'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#C5A880] text-[#0A192F] text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="text-[11px] text-slate-400">
            Showing <span className="text-[#C5A880] font-bold">{filteredMembers.length}</span> of{' '}
            <span className="text-white font-bold">{members.length}</span> members
          </div>
        </div>

        {/* Expandable Filter Options: 1st Year, 2nd Year, 3rd Year, Departments, Class */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-[#1E2E48]/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Year Filter: 1st Year, 2nd Year, 3rd Year */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-cinzel text-slate-400 font-semibold tracking-wider block">
                  Academic Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#030712] border border-[#1E2E48] focus:border-[#C5A880] rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  <option value="1st Year">1st Year (I Year)</option>
                  <option value="2nd Year">2nd Year (II Year)</option>
                  <option value="3rd Year">3rd Year (III Year)</option>
                  {yearOptions
                    .filter((y) => !['I Year', 'II Year', 'III Year', '1st Year', '2nd Year', '3rd Year'].includes(y))
                    .map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-cinzel text-slate-400 font-semibold tracking-wider block">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-[#030712] border border-[#1E2E48] focus:border-[#C5A880] rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none transition-all cursor-pointer truncate"
                >
                  <option value="ALL">All Departments ({members.length})</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} ({deptBreakdown[dept] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Class / Branch Filter */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-cinzel text-slate-400 font-semibold tracking-wider block">
                  Class / Branch
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-[#030712] border border-[#1E2E48] focus:border-[#C5A880] rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none transition-all cursor-pointer truncate"
                >
                  <option value="ALL">All Classes</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Reset */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#C5A880]">Active filters applied</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('ALL');
                    setSelectedDept('ALL');
                    setSelectedClass('ALL');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Members Data Display */}
      {isLoading ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#0B1528] border border-[#1E2E48] space-y-3">
          <RefreshCw className="w-6 h-6 text-[#C5A880] animate-spin mx-auto" />
          <p className="font-cinzel text-sm text-slate-300">Loading registered members from database...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#0B1528] border border-[#1E2E48] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#030712] border border-[#1E2E48] text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-cinzel text-base font-bold text-white">No Members Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || activeFilterCount > 0
              ? 'No member records match your search and filter criteria.'
              : 'No member registrations recorded yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* PHONE & TABLET AUTO-VIEW: Clean & Minimal Cards (Click Card to Open Full Dossier) */}
          <div className="block lg:hidden space-y-2.5 sm:space-y-3">
            {filteredMembers.map((member, index) => {
              const isUserAdmin = member.isAdmin || member.gmail?.toLowerCase() === 'vjana537@gmail.com';
              const rowId = member.id || `member-card-${index}`;

              return (
                <div
                  key={rowId}
                  onClick={() => setSelectedMemberModal(member)}
                  className="p-3 sm:p-4 rounded-xl bg-[#0B1528] border border-[#1E2E48] hover:border-[#C5A880] active:scale-[0.99] transition-all shadow-md cursor-pointer group relative flex items-center justify-between gap-3 text-slate-200"
                >
                  {/* Left: Avatar & Basic Info (Name, Dept, Year, Class) */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-11 h-11 rounded-full object-cover border border-[#C5A880] shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#030712] border border-[#C5A880] flex items-center justify-center text-[#C5A880] font-bold text-sm shrink-0">
                        {member.name ? member.name[0].toUpperCase() : 'M'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-cinzel font-bold text-white text-sm truncate group-hover:text-[#C5A880] transition-colors">
                          {member.name || 'Member'}
                        </h4>
                        {isUserAdmin && (
                          <span className="px-1.5 py-0.2 text-[8px] rounded bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/40 font-bold uppercase shrink-0">
                            ADMIN
                          </span>
                        )}
                      </div>

                      {/* Department & Year Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E2E48] text-[10px] text-[#C5A880] font-medium">
                          {member.department || 'General'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E2E48] text-[10px] text-slate-300 font-medium">
                          {member.year || 'I Year'}
                        </span>
                      </div>

                      {/* Class / Specialization */}
                      {member.className && (
                        <p className="text-[11px] text-slate-400 truncate font-sans pt-0.5">
                          {member.className}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Delete action & Chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToDelete(member);
                      }}
                      className="p-2 rounded-lg bg-[#030712] hover:bg-red-950/50 border border-[#1E2E48] hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-1 text-slate-500 group-hover:text-[#C5A880] transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LAPTOP & DESKTOP AUTO-VIEW: Full Widescreen Table (Visible on screens >= 1024px) */}
          <div className="hidden lg:block rounded-xl bg-[#0B1528] border border-[#1E2E48] shadow-xl overflow-hidden max-w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                {/* Table Header */}
                <thead>
                  <tr className="bg-[#050B14] border-b border-[#1E2E48] text-slate-400 font-cinzel text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-bold text-center w-10">#</th>
                    <th className="py-2.5 px-3 font-bold min-w-[170px]">Member</th>
                    <th className="py-2.5 px-3 font-bold min-w-[180px]">Gmail</th>
                    <th className="py-2.5 px-3 font-bold min-w-[120px]">Phone</th>
                    <th className="py-2.5 px-3 font-bold min-w-[90px]">Year</th>
                    <th className="py-2.5 px-3 font-bold min-w-[110px]">Department</th>
                    <th className="py-2.5 px-3 font-bold min-w-[150px]">Class / Branch</th>
                    <th className="py-2.5 px-3 font-bold min-w-[130px]">Password</th>
                    <th className="py-2.5 px-3 font-bold min-w-[110px]">Date</th>
                    <th className="py-2.5 px-3 font-bold text-right min-w-[80px]">Action</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-[#1E2E48]/60 text-slate-200">
                  {filteredMembers.map((member, index) => {
                    const isUserAdmin = member.isAdmin || member.gmail?.toLowerCase() === 'vjana537@gmail.com';
                    const rowId = member.id || `member-${index}`;
                    const isPasswordRevealed = revealedPasswords[rowId];

                    return (
                      <tr
                        key={rowId}
                        className="hover:bg-[#0E1E38]/80 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {index + 1}
                        </td>

                        {/* Member info */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.name}
                                className="w-7 h-7 rounded-full object-cover border border-[#C5A880]/70 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#030712] border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880] font-bold text-[10px] shrink-0">
                                {member.name ? member.name[0].toUpperCase() : 'M'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-semibold text-white truncate text-xs font-cinzel">
                                  {member.name || 'Member'}
                                </p>
                                {isUserAdmin && (
                                  <span className="px-1 py-0 text-[8px] rounded bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/40 font-bold uppercase shrink-0">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <a
                              href={`mailto:${member.gmail}`}
                              className="text-slate-300 hover:text-[#C5A880] truncate max-w-[150px]"
                              title={member.gmail}
                            >
                              {member.gmail || 'N/A'}
                            </a>
                            {member.gmail && (
                              <button
                                onClick={() => handleCopy(member.gmail, `email-${rowId}`)}
                                className="p-0.5 text-slate-500 hover:text-white"
                                title="Copy Email"
                              >
                                {copiedField === `email-${rowId}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-2.5 px-3">
                          {member.phone ? (
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <a
                                href={`tel:${member.phone}`}
                                className="text-slate-300 hover:text-[#C5A880]"
                              >
                                {member.phone}
                              </a>
                              <button
                                onClick={() => handleCopy(member.phone, `phone-${rowId}`)}
                                className="p-0.5 text-slate-500 hover:text-white"
                                title="Copy Phone"
                              >
                                {copiedField === `phone-${rowId}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>

                        {/* Academic Year */}
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E2E48] text-[11px] font-medium text-[#C5A880] whitespace-nowrap">
                            {member.year || 'I Year'}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E2E48] text-[11px] font-semibold text-white whitespace-nowrap">
                            {member.department || 'General'}
                          </span>
                        </td>

                        {/* Class / Branch */}
                        <td className="py-2.5 px-3">
                          <span className="text-xs text-slate-300 font-medium truncate block max-w-[150px]">
                            {member.className || '—'}
                          </span>
                        </td>

                        {/* Password */}
                        <td className="py-2.5 px-3 font-mono text-xs">
                          {member.password ? (
                            <div className="flex items-center gap-1 bg-[#030712] px-1.5 py-0.5 rounded border border-[#1E2E48] w-fit">
                              <span className="text-slate-300">
                                {isPasswordRevealed ? member.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(rowId)}
                                className="text-slate-400 hover:text-white p-0.5 ml-0.5"
                                title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isPasswordRevealed ? (
                                  <EyeOff className="w-3 h-3 text-[#C5A880]" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(member.password || '', `pwd-${rowId}`)}
                                className="text-slate-400 hover:text-white p-0.5"
                                title="Copy Password"
                              >
                                {copiedField === `pwd-${rowId}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Google Auth</span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString()
                            : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedMemberModal(member)}
                              className="p-1 rounded-lg bg-[#030712] hover:bg-[#112240] border border-[#1E2E48] text-[#C5A880] hover:text-white transition-colors"
                              title="View Full Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setMemberToDelete(member)}
                              className="p-1 rounded-lg bg-[#030712] hover:bg-red-950/50 border border-[#1E2E48] hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Member Full Dossier Modal - Responsive Phone View */}
      {selectedMemberModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedMemberModal(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0B1528] border border-[#C5A880]/50 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3">
              <div className="flex items-center gap-2.5">
                <SocietyLogo size="sm" />
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base sm:text-lg">Member Dossier</h3>
                  <p className="text-[10px] text-[#C5A880] font-medium font-cinzel">Declamate&apos;s Society Registry</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemberModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Profile Avatar & Primary Info */}
            <div className="flex items-center gap-3 bg-[#030712] p-3 rounded-xl border border-[#1E2E48]">
              {selectedMemberModal.photoUrl ? (
                <img
                  src={selectedMemberModal.photoUrl}
                  alt={selectedMemberModal.name}
                  className="w-12 h-12 rounded-full object-cover border border-[#C5A880]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#0A192F] border border-[#C5A880] text-[#C5A880] font-bold text-lg flex items-center justify-center">
                  {selectedMemberModal.name ? selectedMemberModal.name[0].toUpperCase() : 'M'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm sm:text-base font-bold font-cinzel text-white truncate">
                    {selectedMemberModal.name}
                  </h4>
                  {selectedMemberModal.isAdmin && (
                    <span className="px-1.5 py-0.2 text-[8px] rounded bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/40 font-bold uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#C5A880] font-medium mt-0.5">
                  {selectedMemberModal.year} &bull; {selectedMemberModal.department}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-sans">
                  Sri Amaraavathi College, Karur
                </p>
              </div>
            </div>

            {/* Detailed Key-Value Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E2E48] space-y-0.5">
                <span className="text-slate-400 block text-[10px]">Gmail Address</span>
                <span className="font-mono text-white select-all block truncate">
                  {selectedMemberModal.gmail || 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E2E48] space-y-0.5">
                <span className="text-slate-400 block text-[10px]">Phone Contact</span>
                <span className="font-mono text-white select-all block">
                  {selectedMemberModal.phone || 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E2E48] space-y-0.5">
                <span className="text-slate-400 block text-[10px]">Department</span>
                <span className="font-semibold text-white block">
                  {selectedMemberModal.department || 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E2E48] space-y-0.5">
                <span className="text-slate-400 block text-[10px]">Class / Specialization</span>
                <span className="font-semibold text-white block">
                  {selectedMemberModal.className || 'Not specified'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E2E48] space-y-0.5 sm:col-span-2">
                <span className="text-slate-400 block text-[10px]">Registered Password</span>
                <span className="font-mono text-[#C5A880] select-all block text-xs">
                  {selectedMemberModal.password || '(Google Authentication)'}
                </span>
              </div>

              {selectedMemberModal.createdAt && (
                <div className="p-2.5 rounded-lg bg-[#030712] border border-[#1E2E48] space-y-0.5 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px]">Registration Timestamp</span>
                  <span className="font-mono text-slate-300 block text-[11px]">
                    {new Date(selectedMemberModal.createdAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2E48]/80">
              <button
                onClick={() => setSelectedMemberModal(null)}
                className="px-4 py-2 rounded-lg bg-[#030712] hover:bg-[#1E2E48] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#1E2E48]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Responsive */}
      {memberToDelete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setMemberToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-[#0B1528] border border-red-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-500/50 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-white">Delete Member Record?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Remove <span className="text-white font-bold">{memberToDelete.name}</span> ({memberToDelete.gmail}) from the database?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="py-2 px-3 rounded-lg bg-[#030712] hover:bg-[#1E2E48] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#1E2E48]"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

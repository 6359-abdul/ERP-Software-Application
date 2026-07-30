export const formatReportBranch = (branch?: string | null): string => {
    if (!branch || branch === '-') {
        const current = localStorage.getItem('currentBranch');
        branch = current && current !== 'All' && current !== 'All Locations' && current !== 'All Branches' ? current : '-';
    }
    if (branch === '-' || !branch) return '-';
    if (branch === 'All' || branch === 'All Branches' || branch === 'AllBranches' || branch === 'All Locations') {
        return 'MS HifzAcademy - All Branches';
    }
    const cleanBranch = branch.trim();
    if (
        cleanBranch.toLowerCase().startsWith('ms hifzacademy') ||
        cleanBranch.toLowerCase().startsWith('ms hifz academy') ||
        cleanBranch.toLowerCase().startsWith('ms education academy')
    ) {
        return cleanBranch;
    }
    return `MS HifzAcademy ${cleanBranch}`;
};

export const getReportHeaderBranch = (): string => {
    const current = localStorage.getItem('currentBranch');
    if (!current || current === 'All' || current === 'All Locations' || current === 'All Branches') {
        return 'MS HifzAcademy - All Branches';
    }
    return formatReportBranch(current);
};

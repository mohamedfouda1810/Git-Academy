import { useState } from 'react';
import { CourseFilterRequest } from '../lib/api';
import { Search, Filter, X } from 'lucide-react';

interface CourseFiltersProps {
    filters: CourseFilterRequest;
    onFilterChange: (filters: CourseFilterRequest) => void;
}

export function CourseFilters({ filters, onFilterChange }: CourseFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleClearFilters = () => {
        onFilterChange({
            page: 1,
            pageSize: 12,
            searchTerm: '',
            semester: undefined,
            year: undefined,
            minPrice: undefined,
            maxPrice: undefined,
        });
    };

    const hasActiveFilters = filters.searchTerm || filters.semester || filters.year ||
        filters.minPrice !== undefined || filters.maxPrice !== undefined;

    return (
        <div style={{ marginBottom: 32 }}>
            {/* Search Bar */}
            <div className="search-bar">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search courses by name or code..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value, page: 1 })}
                />
            </div>

            {/* Filter Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16
            }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Filter size={18} />
                    {isExpanded ? 'Hide Filters' : 'Show Filters'}
                    {hasActiveFilters && (
                        <span className="badge badge-primary" style={{ marginLeft: 8 }}>
                            Active
                        </span>
                    )}
                </button>

                {hasActiveFilters && (
                    <button
                        className="btn btn-outline"
                        onClick={handleClearFilters}
                    >
                        <X size={18} />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="card slide-up" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                        {/* Semester Filter */}
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select
                                className="form-select"
                                value={filters.semester || ''}
                                onChange={(e) => onFilterChange({ ...filters, semester: e.target.value || undefined, page: 1 })}
                            >
                                <option value="">All Semesters</option>
                                <option value="Fall">Fall</option>
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                            </select>
                        </div>

                        {/* Year Filter */}
                        <div className="form-group">
                            <label className="form-label">Year</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="e.g., 2024"
                                value={filters.year || ''}
                                onChange={(e) => onFilterChange({
                                    ...filters,
                                    year: e.target.value ? parseInt(e.target.value) : undefined,
                                    page: 1
                                })}
                                min="2020"
                                max="2030"
                            />
                        </div>

                        {/* Min Price */}
                        <div className="form-group">
                            <label className="form-label">Min Price ($)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0"
                                value={filters.minPrice || ''}
                                onChange={(e) => onFilterChange({
                                    ...filters,
                                    minPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                                    page: 1
                                })}
                                min="0"
                                step="10"
                            />
                        </div>

                        {/* Max Price */}
                        <div className="form-group">
                            <label className="form-label">Max Price ($)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="1000"
                                value={filters.maxPrice || ''}
                                onChange={(e) => onFilterChange({
                                    ...filters,
                                    maxPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                                    page: 1
                                })}
                                min="0"
                                step="10"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

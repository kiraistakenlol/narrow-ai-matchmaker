import React, { useState } from 'react';
import { ProfileData, SkillLevel } from '@narrow-ai-matchmaker/common';

interface UserProfileViewProps {
    profileData: ProfileData;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ profileData }) => {
    const [expandedRoles, setExpandedRoles] = useState<Record<number, boolean>>({});

    const toggleRole = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRoles(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const formatEnum = (text: string | null) => {
        if (!text) return 'Not specified';
        return text.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const renderSkillLevel = (level: SkillLevel | null) => {
        if (!level) return null;
        
        const levels: Record<string, { width: string; color: string }> = {
            'BEGINNER': { width: '20%', color: '#e9ecef' },
            'FAMILIAR': { width: '40%', color: '#dee2e6' },
            'INTERMEDIATE': { width: '60%', color: '#adb5bd' },
            'ADVANCED': { width: '80%', color: '#6c757d' },
            'EXPERT': { width: '100%', color: '#495057' }
        };
        
        const style = levels[level] || { width: '0%', color: '#e9ecef' };
        
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ 
                    width: '60px', 
                    height: '6px', 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        width: style.width, 
                        height: '100%', 
                        backgroundColor: style.color,
                        borderRadius: '3px'
                    }}></div>
                </div>
                <span style={{ fontSize: '0.7rem' }}>{formatEnum(level)}</span>
            </div>
        );
    };

    const renderCompactSkill = (skill: { skill: string; level: SkillLevel | null }) => (
        <div style={styles.compactSkillItem}>
            <span style={styles.compactSkillName}>{formatEnum(skill.skill)}</span>
            {renderSkillLevel(skill.level)}
        </div>
    );

    const getTopSkills = (skills: { skill: string; level: SkillLevel | null }[], count = 3) => {
        const levelValues = {
            'EXPERT': 5,
            'ADVANCED': 4,
            'INTERMEDIATE': 3,
            'FAMILIAR': 2,
            'BEGINNER': 1
        };
        
        return [...skills]
            .sort((a, b) => {
                const levelA = a.level ? levelValues[a.level as keyof typeof levelValues] || 0 : 0;
                const levelB = b.level ? levelValues[b.level as keyof typeof levelValues] || 0 : 0;
                return levelB - levelA;
            })
            .slice(0, count);
    };

    const getCurrentRole = () => {
        const activeRoles = profileData.roles.filter(role => role.active);
        return activeRoles.length > 0 ? activeRoles[0] : null;
    };

    const currentRole = getCurrentRole();

    if (!profileData) {
        return <div style={styles.card}>No profile data available</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.summaryCard}>
                <div style={styles.summaryHeader}>
                    <h2 style={styles.name}>{profileData.personal.name || 'User Profile'}</h2>
                    {profileData.personal.visiting_status && (
                        <div style={styles.pill}>
                            {formatEnum(profileData.personal.visiting_status)}
                        </div>
                    )}
                </div>
                
                {profileData.personal.headline && (
                    <p style={styles.headline}>{profileData.personal.headline}</p>
                )}

                {currentRole && (
                    <div style={styles.currentRole}>
                        <span style={styles.currentRoleLabel}>Current: </span>
                        <span style={styles.currentRoleTitle}>{currentRole.title || 'Role'}</span>
                        {currentRole.organization.name && (
                            <span style={styles.currentRoleOrg}> at {currentRole.organization.name}</span>
                        )}
                    </div>
                )}

                <div style={styles.summarySection}>
                    <h4 style={styles.summarySectionTitle}>Key Skills</h4>
                    <div style={styles.summarySkills}>
                        {getTopSkills(profileData.skills.hard).map((skill, i) => (
                            <div key={`hard-${i}`} style={styles.summarySkill}>
                                {renderCompactSkill(skill)}
                            </div>
                        ))}
                        {getTopSkills(profileData.skills.soft).map((skill, i) => (
                            <div key={`soft-${i}`} style={styles.summarySkill}>
                                {renderCompactSkill(skill)}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.summarySection}>
                    <h4 style={styles.summarySectionTitle}>Industries & Interests</h4>
                    <div style={styles.summaryTags}>
                        {profileData.industries.slice(0, 3).map((industry, i) => (
                            <span key={i} style={styles.summaryTag}>{formatEnum(industry)}</span>
                        ))}
                        {profileData.hobbies.slice(0, 3).map((hobby, i) => (
                            <span key={i} style={styles.summaryTag}>{formatEnum(hobby)}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>Professional Experience</h3>
                </div>
                <div style={styles.sectionContent}>
                    {profileData.roles.length === 0 ? (
                        <p>No roles specified</p>
                    ) : (
                        <div style={styles.rolesList}>
                            {profileData.roles.map((role, index) => (
                                <div key={index} style={styles.roleCard}>
                                    <div 
                                        style={styles.roleHeader} 
                                        onClick={(e) => toggleRole(index, e)}
                                    >
                                        <div style={{flex: 1}}>
                                            <h4 style={styles.roleTitle}>
                                                {role.title || 'Untitled Role'}
                                                {role.active && <span style={styles.activeBadge}>Current</span>}
                                            </h4>
                                            <p style={styles.orgName}>
                                                {role.organization.name || 'Unknown Organization'}
                                            </p>
                                        </div>
                                        <span style={styles.roleExpandIcon}>
                                            {expandedRoles[index] ? '−' : '+'}
                                        </span>
                                    </div>
                                    
                                    {expandedRoles[index] && (
                                        <div style={styles.roleDetails}>
                                            <div style={styles.roleDetailsList}>
                                                {role.organization.org_type && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Organization Type:</span>
                                                        <span>{formatEnum(role.organization.org_type)}</span>
                                                    </div>
                                                )}
                                                {role.category && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Category:</span>
                                                        <span>{formatEnum(role.category)}</span>
                                                    </div>
                                                )}
                                                {role.sub_category && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Role Type:</span>
                                                        <span>{formatEnum(role.sub_category)}</span>
                                                    </div>
                                                )}
                                                {role.seniority && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Seniority:</span>
                                                        <span>{formatEnum(role.seniority)}</span>
                                                    </div>
                                                )}
                                                {role.engagement.type && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Engagement:</span>
                                                        <span>{formatEnum(role.engagement.type)}</span>
                                                    </div>
                                                )}
                                                {role.engagement.commitment && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Commitment:</span>
                                                        <span>{formatEnum(role.engagement.commitment)}</span>
                                                    </div>
                                                )}
                                                {role.engagement.work_mode && (
                                                    <div style={styles.roleDetailItem}>
                                                        <span style={styles.detailLabel}>Work Mode:</span>
                                                        <span>{formatEnum(role.engagement.work_mode)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {role.highlights.length > 0 && (
                                                <div style={styles.roleSection}>
                                                    <h5 style={styles.detailLabel}>Highlights</h5>
                                                    <ul style={styles.highlightsList}>
                                                        {role.highlights.map((highlight, i) => (
                                                            <li key={i} style={styles.highlightItem}>{highlight}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {profileData.extra_notes && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>Additional Information</h3>
                    </div>
                    <div style={styles.sectionContent}>
                        <p style={styles.notes}>{profileData.extra_notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#212529',
        maxWidth: '100%',
        margin: '0 auto',
        padding: '10px 0'
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    summaryHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px'
    },
    name: {
        fontSize: '20px',
        fontWeight: 600,
        margin: '0 0 4px 0'
    },
    headline: {
        fontSize: '14px',
        margin: '0 0 12px 0',
        color: '#495057'
    },
    currentRole: {
        fontSize: '14px',
        margin: '0 0 12px 0',
        padding: '6px 10px',
        backgroundColor: '#f1f3f5',
        borderRadius: '4px',
        display: 'inline-block'
    },
    currentRoleLabel: {
        fontWeight: 500,
    },
    currentRoleTitle: {
        fontWeight: 600,
    },
    currentRoleOrg: {
        color: '#495057'
    },
    summarySection: {
        marginBottom: '12px'
    },
    summarySectionTitle: {
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 8px 0'
    },
    summarySkills: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '6px',
    },
    summarySkill: {
        fontSize: '13px'
    },
    summaryTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
    },
    summaryTag: {
        backgroundColor: '#e9ecef',
        color: '#495057',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px'
    },
    pill: {
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '12px',
        backgroundColor: '#e9ecef',
        color: '#495057',
        fontSize: '12px',
        fontWeight: 500
    },
    sectionCard: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '0',
        marginBottom: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionHeader: {
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e9ecef'
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 600,
        margin: 0
    },
    sectionContent: {
        padding: '12px 16px'
    },
    compactSkillItem: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '13px',
        padding: '4px 0'
    },
    compactSkillName: {
        fontWeight: 500,
        marginBottom: '2px'
    },
    rolesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    roleCard: {
        border: '1px solid #e9ecef',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    roleHeader: {
        padding: '10px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        cursor: 'pointer'
    },
    roleTitle: {
        margin: '0 0 2px 0',
        fontSize: '14px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    activeBadge: {
        fontSize: '10px',
        fontWeight: 'normal',
        padding: '1px 4px',
        backgroundColor: '#d0ebff',
        color: '#1c7ed6',
        borderRadius: '2px'
    },
    orgName: {
        margin: 0,
        fontSize: '12px',
        color: '#495057'
    },
    roleExpandIcon: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#adb5bd'
    },
    roleDetails: {
        padding: '10px 12px',
        backgroundColor: 'white'
    },
    roleDetailsList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '8px',
        marginBottom: '10px',
        fontSize: '13px'
    },
    roleDetailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    roleSection: {
        marginBottom: '10px'
    },
    detailLabel: {
        fontSize: '12px',
        fontWeight: 600,
        margin: '0 0 2px 0',
        color: '#495057'
    },
    highlightsList: {
        margin: '6px 0',
        paddingLeft: '16px',
        fontSize: '13px'
    },
    highlightItem: {
        margin: '2px 0'
    },
    notes: {
        fontSize: '13px',
        margin: 0
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }
};

export default UserProfileView; 
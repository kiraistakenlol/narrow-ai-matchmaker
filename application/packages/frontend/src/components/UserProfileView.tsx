import React, { useState } from 'react';
import { ProfileData, SkillLevel } from '@narrow-ai-matchmaker/common';

interface UserProfileViewProps {
    profileData: ProfileData;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ profileData }) => {
    const [expandedRoles, setExpandedRoles] = useState<Record<number, boolean>>({});

    const toggleRole = (index: number) => {
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
        if (!level) return <span className="skill-level">Not specified</span>;
        
        const levels: Record<string, { width: string; color: string }> = {
            'BEGINNER': { width: '20%', color: '#e9ecef' },
            'FAMILIAR': { width: '40%', color: '#dee2e6' },
            'INTERMEDIATE': { width: '60%', color: '#adb5bd' },
            'ADVANCED': { width: '80%', color: '#6c757d' },
            'EXPERT': { width: '100%', color: '#495057' }
        };
        
        const style = levels[level] || { width: '0%', color: '#e9ecef' };
        
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                    width: '100px', 
                    height: '8px', 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        width: style.width, 
                        height: '100%', 
                        backgroundColor: style.color,
                        borderRadius: '4px'
                    }}></div>
                </div>
                <span style={{ fontSize: '0.8rem' }}>{formatEnum(level)}</span>
            </div>
        );
    };

    const renderSkillList = (skills: { skill: string; level: SkillLevel | null }[]) => {
        if (!skills.length) return <p>None specified</p>;

        return (
            <div style={styles.skillGrid}>
                {skills.map((skill, i) => (
                    <div key={i} style={styles.skillItem}>
                        <div style={styles.skillName}>{formatEnum(skill.skill)}</div>
                        {renderSkillLevel(skill.level)}
                    </div>
                ))}
            </div>
        );
    };

    const renderTagList = (items: string[]) => {
        if (!items.length) return <p>None specified</p>;

        return (
            <div style={styles.tagContainer}>
                {items.map((item, i) => (
                    <span key={i} style={styles.tag}>{formatEnum(item)}</span>
                ))}
            </div>
        );
    };

    if (!profileData) {
        return <div style={styles.card}>No profile data available</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.name}>{profileData.personal.name || 'User Profile'}</h2>
                {profileData.personal.headline && (
                    <p style={styles.headline}>{profileData.personal.headline}</p>
                )}
                {profileData.personal.visiting_status && (
                    <div style={styles.pill}>
                        {formatEnum(profileData.personal.visiting_status)}
                    </div>
                )}
            </div>

            <div style={styles.twoColumnGrid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Industries</h3>
                    {renderTagList(profileData.industries)}
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Hobbies & Interests</h3>
                    {renderTagList(profileData.hobbies)}
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Technical Skills</h3>
                {renderSkillList(profileData.skills.hard)}
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Soft Skills</h3>
                {renderSkillList(profileData.skills.soft)}
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Professional Experience</h3>
                {profileData.roles.length === 0 ? (
                    <p>No roles specified</p>
                ) : (
                    <div style={styles.rolesList}>
                        {profileData.roles.map((role, index) => (
                            <div key={index} style={styles.roleCard}>
                                <div 
                                    style={styles.roleHeader} 
                                    onClick={() => toggleRole(index)}
                                >
                                    <div>
                                        <h4 style={styles.roleTitle}>
                                            {role.title || 'Untitled Role'}
                                            {role.active && <span style={styles.activeBadge}>Current</span>}
                                        </h4>
                                        <p style={styles.orgName}>
                                            {role.organization.name || 'Unknown Organization'}
                                            {role.organization.org_type && 
                                                <span style={styles.orgType}> · {formatEnum(role.organization.org_type)}</span>
                                            }
                                        </p>
                                    </div>
                                    <span style={styles.expandIcon}>
                                        {expandedRoles[index] ? '−' : '+'}
                                    </span>
                                </div>
                                
                                {expandedRoles[index] && (
                                    <div style={styles.roleDetails}>
                                        <div style={styles.roleDetailsGrid}>
                                            {role.category && (
                                                <div>
                                                    <h5 style={styles.detailLabel}>Category</h5>
                                                    <p>{formatEnum(role.category)}</p>
                                                </div>
                                            )}
                                            {role.sub_category && (
                                                <div>
                                                    <h5 style={styles.detailLabel}>Role Type</h5>
                                                    <p>{formatEnum(role.sub_category)}</p>
                                                </div>
                                            )}
                                            {role.seniority && (
                                                <div>
                                                    <h5 style={styles.detailLabel}>Seniority</h5>
                                                    <p>{formatEnum(role.seniority)}</p>
                                                </div>
                                            )}
                                            {role.engagement.type && (
                                                <div>
                                                    <h5 style={styles.detailLabel}>Engagement</h5>
                                                    <p>{formatEnum(role.engagement.type)}</p>
                                                </div>
                                            )}
                                            {role.engagement.commitment && (
                                                <div>
                                                    <h5 style={styles.detailLabel}>Commitment</h5>
                                                    <p>{formatEnum(role.engagement.commitment)}</p>
                                                </div>
                                            )}
                                            {role.engagement.work_mode && (
                                                <div>
                                                    <h5 style={styles.detailLabel}>Work Mode</h5>
                                                    <p>{formatEnum(role.engagement.work_mode)}</p>
                                                </div>
                                            )}
                                        </div>

                                        {role.organization.industries.length > 0 && (
                                            <div style={styles.roleSection}>
                                                <h5 style={styles.detailLabel}>Industries</h5>
                                                {renderTagList(role.organization.industries)}
                                            </div>
                                        )}

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

                                        {(role.skills.hard.length > 0 || role.skills.soft.length > 0) && (
                                            <div style={styles.roleSection}>
                                                <h5 style={styles.detailLabel}>Skills Used</h5>
                                                {role.skills.hard.length > 0 && (
                                                    <div style={styles.tagContainer}>
                                                        {role.skills.hard.map((skill, i) => (
                                                            <span key={i} style={styles.skillTag}>
                                                                {formatEnum(skill.skill)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {role.skills.soft.length > 0 && (
                                                    <div style={styles.tagContainer}>
                                                        {role.skills.soft.map((skill, i) => (
                                                            <span key={i} style={styles.softSkillTag}>
                                                                {formatEnum(skill.skill)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {profileData.extra_notes && (
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Additional Information</h3>
                    <p>{profileData.extra_notes}</p>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#212529',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px 0'
    },
    header: {
        marginBottom: '24px',
        padding: '24px',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    name: {
        fontSize: '24px',
        fontWeight: 600,
        margin: '0 0 8px 0'
    },
    headline: {
        fontSize: '16px',
        margin: '0 0 16px 0',
        color: '#495057'
    },
    pill: {
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '16px',
        backgroundColor: '#e9ecef',
        color: '#495057',
        fontSize: '14px',
        fontWeight: 500
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: 600,
        marginTop: 0,
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e9ecef'
    },
    twoColumnGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
    },
    tagContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '8px 0'
    },
    tag: {
        backgroundColor: '#e9ecef',
        color: '#495057',
        padding: '4px 10px',
        borderRadius: '16px',
        fontSize: '14px'
    },
    skillTag: {
        backgroundColor: '#e7f5ff',
        color: '#1971c2',
        padding: '4px 10px',
        borderRadius: '16px',
        fontSize: '14px'
    },
    softSkillTag: {
        backgroundColor: '#f3f0ff',
        color: '#6741d9',
        padding: '4px 10px',
        borderRadius: '16px',
        fontSize: '14px'
    },
    skillGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px'
    },
    skillItem: {
        padding: '8px',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
    },
    skillName: {
        marginBottom: '4px',
        fontWeight: 500
    },
    rolesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    roleCard: {
        border: '1px solid #e9ecef',
        borderRadius: '6px',
        overflow: 'hidden'
    },
    roleHeader: {
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        backgroundColor: '#f8f9fa',
        transition: 'background-color 0.2s'
    },
    roleTitle: {
        margin: '0 0 4px 0',
        fontSize: '16px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    activeBadge: {
        fontSize: '12px',
        fontWeight: 'normal',
        padding: '2px 6px',
        backgroundColor: '#d0ebff',
        color: '#1c7ed6',
        borderRadius: '4px'
    },
    orgName: {
        margin: 0,
        fontSize: '14px',
        color: '#495057'
    },
    orgType: {
        color: '#868e96'
    },
    expandIcon: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#adb5bd'
    },
    roleDetails: {
        padding: '16px',
        backgroundColor: 'white'
    },
    roleDetailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
    },
    roleSection: {
        marginBottom: '16px'
    },
    detailLabel: {
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 4px 0',
        color: '#495057'
    },
    highlightsList: {
        margin: '8px 0',
        paddingLeft: '20px'
    },
    highlightItem: {
        margin: '4px 0'
    }
};

export default UserProfileView; 
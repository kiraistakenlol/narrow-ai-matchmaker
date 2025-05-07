import React from 'react';
import { ProfileData, SkillLevel } from '@narrow-ai-matchmaker/common';

interface UserProfileSummaryViewProps {
    profileData: ProfileData;
}

const UserProfileSummaryView: React.FC<UserProfileSummaryViewProps> = ({ profileData }) => {

    const formatEnum = (text: string | null) => {
        if (!text) return 'Not specified';
        return text.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const renderSkillLevelIndicator = (level: SkillLevel | null) => {
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
            <div style={{ 
                width: '50px', 
                height: '5px', 
                backgroundColor: '#f8f9fa',
                borderRadius: '2.5px',
                overflow: 'hidden',
                display: 'inline-block',
                marginLeft: '5px'
            }}>
                <div style={{ 
                    width: style.width, 
                    height: '100%', 
                    backgroundColor: style.color,
                    borderRadius: '2.5px'
                }}></div>
            </div>
        );
    };

    const getTopSkills = (skills: { skill: string; level: SkillLevel | null }[], count = 2) => {
        const levelValues = {
            'EXPERT': 5, 'ADVANCED': 4, 'INTERMEDIATE': 3, 'FAMILIAR': 2, 'BEGINNER': 1
        };
        return [...skills]
            .sort((a, b) => (b.level ? levelValues[b.level as keyof typeof levelValues] : 0) - (a.level ? levelValues[a.level as keyof typeof levelValues] : 0))
            .slice(0, count);
    };

    const getCurrentRole = () => {
        const activeRoles = profileData.roles?.filter(role => role.active);
        return activeRoles && activeRoles.length > 0 ? activeRoles[0] : null;
    };

    const currentRole = getCurrentRole();

    if (!profileData) {
        return <div style={styles.card}>No profile data to summarize.</div>;
    }

    const topHardSkills = getTopSkills(profileData.skills?.hard || [], 2);
    const topSoftSkills = getTopSkills(profileData.skills?.soft || [], 1);

    return (
        <div style={styles.card}>
            <h3 style={styles.name}>{profileData.personal?.name || 'User Profile'}</h3>
            {profileData.personal?.headline && (
                <p style={styles.headline}>{profileData.personal.headline}</p>
            )}

            {currentRole && (
                <div style={styles.section}>
                    <p style={styles.roleInfo}>
                        Current: <span style={styles.roleTitle}>{currentRole.title || 'Role'}</span>
                        {currentRole.organization?.name && (
                            <span style={styles.orgName}> at {currentRole.organization.name}</span>
                        )}
                    </p>
                </div>
            )}

            {(topHardSkills.length > 0 || topSoftSkills.length > 0) && (
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Key Skills</h4>
                    <div style={styles.tagContainer}>
                        {topHardSkills.map((skill, i) => (
                            <span key={`hard-${i}`} style={styles.tag}>
                                {formatEnum(skill.skill)}
                                {renderSkillLevelIndicator(skill.level)}
                            </span>
                        ))}
                        {topSoftSkills.map((skill, i) => (
                             <span key={`soft-${i}`} style={styles.tag}>
                                {formatEnum(skill.skill)}
                                {renderSkillLevelIndicator(skill.level)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {(profileData.industries?.length > 0 || profileData.hobbies?.length > 0) && (
                 <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Interests</h4>
                    <div style={styles.tagContainer}>
                        {profileData.industries?.slice(0, 2).map((industry, i) => (
                            <span key={`ind-${i}`} style={styles.tag}>{formatEnum(industry)}</span>
                        ))}
                        {profileData.hobbies?.slice(0, 1).map((hobby, i) => (
                            <span key={`hob-${i}`} style={styles.tag}>{formatEnum(hobby)}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#333',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        border: '1px solid #e9ecef',
    },
    name: {
        fontSize: '1.1em',
        fontWeight: 600,
        margin: '0 0 5px 0',
        color: '#212529',
    },
    headline: {
        fontSize: '0.9em',
        margin: '0 0 10px 0',
        color: '#495057',
        fontStyle: 'italic',
    },
    section: {
        marginBottom: '10px',
    },
    sectionTitle: {
        fontSize: '0.8em',
        fontWeight: 600,
        margin: '0 0 5px 0',
        color: '#343a40',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    roleInfo: {
        fontSize: '0.9em',
        margin: '0',
        color: '#495057',
    },
    roleTitle: {
        fontWeight: 500,
        color: '#212529',
    },
    orgName: {
        color: '#6c757d',
    },
    tagContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
    },
    tag: {
        backgroundColor: '#f1f3f5',
        color: '#495057',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '0.8em',
        display: 'inline-flex',
        alignItems: 'center',
    }
};

export default UserProfileSummaryView; 
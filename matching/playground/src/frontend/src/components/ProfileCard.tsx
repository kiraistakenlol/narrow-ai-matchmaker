import React from 'react';
import { FullProfile, Role, HardSkillEntry, SoftSkillEntry, Engagement } from '../../../../common/src/types/full-profile.types';

interface ProfileCardProps {
  profile: FullProfile;
}

// Helper to format arrays concisely (moved from ProfileList)
const formatArray = (arr: string[] | undefined | null): string => {
  if (!arr || arr.length === 0) return 'N/A';
  return arr.join(', '); // Simply join all items
};

// Helper to format engagement details
const formatEngagement = (engagement: Engagement | undefined | null): string => {
  if (!engagement) return 'N/A';
  const parts = [
    engagement.type,
    engagement.commitment,
    engagement.work_mode
  ].filter(Boolean); // Filter out null/undefined values
  return parts.join(', ') || 'N/A';
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  // Base styles for the card ensure text visibility
  const cardStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    marginBottom: '15px',
    padding: '15px',
    borderRadius: '5px',
    background: '#f9f9f9', // Keep light background
    color: '#333', // Ensure dark text color for contrast
    fontFamily: 'sans-serif', // Inherit or set a default font
  };

  const headingStyle: React.CSSProperties = {
    margin: '0 0 5px 0',
    fontSize: '1.1em',
    color: '#111', // Slightly darker for headings
  };

  const paragraphStyle: React.CSSProperties = {
    margin: 0,
    color: '#555', // Keep slightly lighter gray for secondary text
    fontSize: '0.9em',
  };

  const detailStyle: React.CSSProperties = {
    marginBottom: '10px',
    fontSize: '0.9em',
  };

   const labelStyle: React.CSSProperties = {
     fontWeight: 'bold',
     color: '#333',
   };

  const roleContainerStyle: React.CSSProperties = {
    marginTop: '10px', 
    paddingTop: '10px',
    borderTop: '1px solid #eee',
  };

  const roleItemStyle: React.CSSProperties = {
     marginBottom: '10px', 
     paddingLeft: '10px',
     borderLeft: '3px solid #ccc',
  };

  const activeRoleItemStyle: React.CSSProperties = {
     ...roleItemStyle,
     borderLeft: '3px solid #007bff', // Use a different color for active role
   };

  return (
    <li style={cardStyle}>
      {/* Personal Info */}
      <div style={{ marginBottom: '12px' }}>
        <h3 style={headingStyle}>{profile.personal?.name ?? 'No Name'}</h3>
        <p style={paragraphStyle}>{profile.personal?.headline ?? 'No Headline'}</p>
        {profile.personal?.visiting_status && (
          <p style={{ ...paragraphStyle, marginTop: '5px', fontSize: '0.8em', color: '#777' }}>
            Status: {profile.personal.visiting_status}
          </p>
        )}
      </div>

      {/* Roles - Display All */}
      <div style={roleContainerStyle}>
        <strong style={{...labelStyle, marginBottom: '5px', display: 'block'}}>Roles:</strong>
        {(!profile.roles || profile.roles.length === 0) ? (
            <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#777' }}>No roles listed.</span>
        ) : (
          profile.roles.map((role: Role, index: number) => (
            <div key={index} style={role.active ? activeRoleItemStyle : roleItemStyle}>
              <span style={{ display: 'block', fontWeight: 'bold' }}>
                {role.title ?? 'N/A'} ({role.seniority ?? 'N/A'}) {role.active ? ' (Active)' : ' (Past)'}
              </span>
              <span style={{ display: 'block', marginLeft: '10px' }}>
                 @ {role.organization?.name ?? 'N/A'} ({role.organization?.org_type ?? 'N/A'})
              </span>
              <span style={{ display: 'block', marginLeft: '10px' }}>
                 Engagement: {formatEngagement(role.engagement)}
               </span>
              {role.highlights && role.highlights.length > 0 && (
                <>
                  <span style={{ display: 'block', marginLeft: '10px', marginTop: '3px' }}>Highlights:</span>
                  <ul style={{ margin: '2px 0 0 20px', paddingLeft: '15px', fontSize: '0.85em' }}>
                    {role.highlights.slice(0, 2).map((highlight: string, hIndex: number) => (
                       <li key={hIndex}>{highlight}</li>
                    ))}
                    {role.highlights.length > 2 && <li>...</li>}
                  </ul>
                </>
              )}
            </div>
          ))
        )}
       </div>

      {/* Skills - Hard */}
      <div style={detailStyle}>
        <strong style={labelStyle}>Hard Skills:</strong> {formatArray(profile.skills?.hard?.map((s: HardSkillEntry) => s.skill))}
      </div>

      {/* Skills - Soft */}
      <div style={detailStyle}>
        <strong style={labelStyle}>Soft Skills:</strong> {formatArray(profile.skills?.soft?.map((s: SoftSkillEntry) => s.skill))}
      </div>

      {/* Industries */}
      <div style={detailStyle}>
        <strong style={labelStyle}>Industries:</strong> {formatArray(profile.industries)}
      </div>

      {/* Hobbies */}
      <div style={detailStyle}>
         <strong style={labelStyle}>Hobbies:</strong> {formatArray(profile.hobbies)}
      </div>

      {/* Goals */}
      <div style={{ fontSize: '0.9em' }}>
        <strong style={labelStyle}>Looking for:</strong> {formatArray(profile.event_context?.goals?.looking_for)}
        <br />
        <strong style={labelStyle}>Offering:</strong> {formatArray(profile.event_context?.goals?.offering)}
      </div>

      {/* Extra Notes */}
      {profile.extra_notes && (
          <div style={{ ...detailStyle, marginTop: '10px' }}>
            <strong style={labelStyle}>Notes:</strong> {profile.extra_notes.substring(0, 100)}{profile.extra_notes.length > 100 ? '...' : ''}
          </div>
      )}
    </li>
  );
} 
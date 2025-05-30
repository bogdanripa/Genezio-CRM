import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Avatar, AvatarImage, AvatarFallback } from './avatar.tsx';

// Styled components for layout and styling
const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const Control = styled.div`
  cursor: pointer;
  display: inline-block;
`;

const PlaceholderButton = styled.button`
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
`;

const Avatars = styled.div`
  display: flex;
`;

const Overlap = styled.div`
  margin-left: -12px;
  &:first-child {
    margin-left: 0;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 8px;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
`;

const Group = styled.div`
  margin-bottom: 12px;
`;

const GroupLabel = styled.div`
  font-weight: bold;
  margin-bottom: 6px;
`;

const Item = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const ItemLabel = styled.span`
  margin-left: 8px;
`;

interface Person {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PeopleSelectorProps {
  teamMembers?: Person[];
  contacts?: Person[];
  selectedPeople: Person[];
  onChange?: (people: Person[]) => void;
  placeholder?: string;
  multiSelect?: boolean;
}

const PeopleSelector: React.FC<PeopleSelectorProps> = ({
  teamMembers,
  contacts = [],
  selectedPeople,
  onChange,
  placeholder = 'Choose',
  multiSelect = true
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = (e) => {
    if (!onChange) return;
    setIsOpen(prev => !prev);
    e.stopPropagation();
  }

  useEffect(() => {
    const handleClickOutside = () => {
      setIsOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = person => {
    let updated;
    if (multiSelect) {
      const exists = selectedPeople.find(p => p.id === person.id);
      updated = exists
        ? selectedPeople.filter(p => p.id !== person.id)
        : [...selectedPeople, person];
    } else {
      updated = selectedPeople[0]?.id === person.id ? [] : [person];
    }
    onChange(updated);
  };

  return (
    <Container>
      <Control onClick={toggleDropdown}>
        {selectedPeople.length > 0 ? (
          <Avatars>
            {selectedPeople.map((person, index) => (
              <Overlap key={person.id} style={{ zIndex: index }}>
                <Avatar>
                  {person.avatarUrl ? (
                    <AvatarImage src={person.avatarUrl} alt={person.name} />
                  ) : (
                    <AvatarFallback title={person.name} />
                  )}
                </Avatar>
              </Overlap>
            ))}
          </Avatars>
        ) : (
          <PlaceholderButton>{placeholder}</PlaceholderButton>
        )}
      </Control>

      {isOpen && (
        <Dropdown onClick={e => e.stopPropagation()}>
          {teamMembers.length > 0 && (
            <Group>
              <GroupLabel>Team Members</GroupLabel>
              {teamMembers.map(person => (
                <Item key={person.id}>
                  <Checkbox
                    type="checkbox"
                    checked={!!selectedPeople.find(p => p.id === person.id)}
                    onChange={() => handleSelect(person)}
                  />
                  <Avatar>
                    {person.avatarUrl ? (
                      <AvatarImage src={person.avatarUrl} alt={person.name} />
                    ) : (
                      <AvatarFallback title={person.name} />
                    )}
                  </Avatar>
                  <ItemLabel>{person.name}</ItemLabel>
                </Item>
              ))}
            </Group>
          )}

          {contacts.length > 0 && (
            <Group>
              <GroupLabel>Contacts</GroupLabel>
              {contacts.map(person => (
                <Item key={person.id}>
                  <Checkbox
                    type="checkbox"
                    checked={!!selectedPeople.find(p => p.id === person.id)}
                    onChange={() => handleSelect(person)}
                  />
                  <Avatar>
                    {person.avatarUrl ? (
                      <AvatarImage src={person.avatarUrl} alt={person.name} />
                    ) : (
                      <AvatarFallback title={person.name} />
                    )}
                  </Avatar>
                  <ItemLabel>{person.name}</ItemLabel>
                </Item>
              ))}
            </Group>
          )}
        </Dropdown>
      )}
    </Container>
  );
};

export default PeopleSelector;

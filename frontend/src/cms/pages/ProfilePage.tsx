import { api } from '../api';
import { SingletonEditor } from '../editors';
import type { FieldSpec } from '../fields';

/** The hero's identity, and every way of reaching him. One row, `profile`. */
const SPECS: FieldSpec[] = [
  { name: 'name', label: 'Name', placeholder: 'Ali Mroue' },
  { name: 'role', label: 'Role', placeholder: 'Full-Stack AI Engineer' },
  {
    name: 'availability',
    label: 'Availability',
    hint: 'Shown under the hero and in the contact block.',
    placeholder: 'Beirut, Lebanon — available for work',
    span: 2,
  },
  {
    name: 'intro',
    label: 'Intro',
    type: 'textarea',
    rows: 4,
    hint: 'The paragraph under the headline. Two sentences carries it.',
  },
  {
    name: 'specialities',
    label: 'Specialities',
    type: 'list',
    hint: 'Cycled by the rolling headline, in this order.',
    itemPlaceholder: 'RAG Systems',
  },
  { name: 'email', label: 'Email', placeholder: 'you@example.com' },
  { name: 'phone', label: 'Phone', placeholder: '+961 81 651 281' },
  {
    name: 'phone_href',
    label: 'Phone link',
    hint: 'What the number dials — keep the tel: prefix.',
    placeholder: 'tel:+96181651281',
  },
  { name: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://www.linkedin.com/in/…' },
  { name: 'github', label: 'GitHub URL', placeholder: 'https://github.com/…' },
];

export function ProfilePage() {
  return (
    <SingletonEditor
      title="Profile"
      description="Who the site is about. The name, role, and contact details used across the hero and the contact section."
      specs={SPECS}
      resource={api.profile}
    />
  );
}

import { api } from '../api';
import { SingletonEditor } from '../editors';
import type { FieldSpec } from '../fields';

const SPECS: FieldSpec[] = [
  {
    name: 'cta',
    label: 'Button label',
    placeholder: 'Start a conversation',
    hint: 'The magnetic button next to the email address. It opens a mail draft.',
  },
  { name: 'place', label: 'Place line', placeholder: 'Beirut, 2026.' },
  {
    name: 'colophon',
    label: 'Colophon',
    span: 2,
    placeholder: 'Built with React, GSAP, and too much coffee.',
    hint: 'Bottom left of the footer strip.',
  },
];

export function ContactPage() {
  return (
    <SingletonEditor
      title="Contact"
      description="The closing section. The email, phone, and links themselves come from Profile — this is the wording around them."
      specs={SPECS}
      resource={api.contact}
    />
  );
}

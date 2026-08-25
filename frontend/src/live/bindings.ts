/**
 * What a piece of text on the page is, in database terms.
 *
 * A `Binding` is the whole answer for one editable string: what it currently
 * says, how to write it back, and how to update the page once the write lands.
 * Components pass one to `<Editable>` and stay ignorant of the API — the same
 * way they are ignorant of where their copy came from.
 *
 * Public content is camelCase and shaped for rendering; the tables are
 * snake_case. The mapping between them lives here and nowhere else, which is
 * why every binding is spelled out rather than derived: there are about thirty
 * of them, they change when the schema changes, and a wrong guess would write to
 * the wrong column silently.
 *
 * Anything without a row id — the bundled copy, when the API is down — reports
 * `editable: false`, and `<Editable>` renders plain text. There is nothing to
 * save to, so there is nothing to offer.
 */

import {
  about,
  ask,
  contact,
  contentSource,
  experience,
  profile,
  projects,
  stack,
  type Footnote,
  type Project,
  type Role,
  type StackGroup,
  type StackTile,
  type Stat,
} from '../content';
import { api } from '../cms/api';
import { applyLocal } from './store';

export type Binding = {
  /** What the element shows now. */
  value: string;
  /** Writes the new value, then updates the page. Rejects on failure. */
  save: (next: string) => Promise<void>;
  /** False when this text has no row behind it. */
  editable: boolean;
  /** A hint for the editor: long copy gets a taller hit area and no Enter-to-save. */
  multiline?: boolean;
  /** Shown in the tooltip, so you know what you are about to change. */
  label: string;
};

/** Only content that came from the API can be written back to it. */
const live = () => contentSource === 'api';

type Make = {
  value: unknown;
  label: string;
  multiline?: boolean;
  editable?: boolean;
  write: (next: string) => Promise<unknown>;
  apply: (next: string) => void;
};

const make = ({ value, label, multiline, editable = true, write, apply }: Make): Binding => ({
  value: value == null ? '' : String(value),
  label,
  multiline,
  editable: editable && live(),
  save: async (next) => {
    await write(next);
    applyLocal(() => apply(next));
  },
});

/** Replaces one entry of a JSON string column, leaving the rest alone. */
const withItem = (list: string[], index: number, next: string) =>
  list.map((item, i) => (i === index ? next : item));

// --------------------------------------------------------------------------- //
// Singletons
// --------------------------------------------------------------------------- //

type ProfileText = 'name' | 'role' | 'availability' | 'intro' | 'email' | 'phone';

const profileField = (field: ProfileText, label: string, multiline = false): Binding =>
  make({
    value: profile[field],
    label,
    multiline,
    write: (next) => api.profile.update({ [field]: next }),
    apply: (next) => {
      profile[field] = next;
    },
  });

const SECTIONS = { about, stack, projects, experience, contact } as const;
type SectionKey = keyof typeof SECTIONS;

const sectionField = (key: SectionKey, field: 'eyebrow' | 'heading'): Binding =>
  make({
    value: SECTIONS[key][field],
    label: `${key} ${field}`,
    write: (next) => api.sections.update(key, { [field]: next }),
    apply: (next) => {
      SECTIONS[key][field] = next;
    },
  });

// --------------------------------------------------------------------------- //
// Bindings, by where they appear on the page
// --------------------------------------------------------------------------- //

export const edit = {
  section: sectionField,

  profile: {
    name: () => profileField('name', 'Name'),
    role: () => profileField('role', 'Role'),
    availability: () => profileField('availability', 'Availability'),
    intro: () => profileField('intro', 'Hero intro', true),
    email: () => profileField('email', 'Email'),
    phone: () => profileField('phone', 'Phone'),
  },

  about: {
    portraitPlaceholder: (): Binding =>
      make({
        value: about.portraitPlaceholder,
        label: 'Portrait placeholder',
        write: (next) => api.about.update({ portrait_placeholder: next }),
        apply: (next) => {
          about.portraitPlaceholder = next;
        },
      }),

    portrait: (): Binding =>
      make({
        value: about.portraitImage ?? '',
        label: 'Portrait',
        write: (next) => api.about.update({ portrait_image: next }),
        apply: (next) => {
          about.portraitImage = next;
        },
      }),

    paragraph: (index: number): Binding =>
      make({
        value: about.paragraphs[index],
        label: `About paragraph ${index + 1}`,
        multiline: true,
        write: (next) =>
          api.about.update({ paragraphs: withItem(about.paragraphs, index, next) }),
        apply: (next) => {
          about.paragraphs[index] = next;
        },
      }),

    statLabel: (stat: Stat): Binding =>
      make({
        value: stat.label,
        label: 'Stat label',
        editable: stat.id != null,
        write: (next) => api.stats.update(stat.id!, { label: next }),
        apply: (next) => {
          stat.label = next;
        },
      }),
  },

  stack: {
    groupName: (group: StackGroup): Binding =>
      make({
        value: group.name,
        label: 'Group name',
        editable: group.id != null,
        write: (next) => api.stackGroups.update(group.id!, { name: next }),
        apply: (next) => {
          group.name = next;
        },
      }),

    pill: (group: StackGroup, index: number): Binding =>
      make({
        value: group.pills[index],
        label: 'Extra',
        editable: group.id != null,
        write: (next) =>
          api.stackGroups.update(group.id!, { pills: withItem(group.pills, index, next) }),
        apply: (next) => {
          group.pills[index] = next;
        },
      }),

    tileName: (tile: StackTile): Binding =>
      make({
        value: tile.name,
        label: 'Tool name',
        editable: tile.id != null,
        write: (next) => api.stackTiles.update(tile.id!, { name: next }),
        apply: (next) => {
          tile.name = next;
        },
      }),
  },

  project: {
    number: (project: Project): Binding =>
      make({
        value: project.number,
        label: 'Card number',
        editable: project.id != null,
        write: (next) => api.projects.update(project.id!, { number: next }),
        apply: (next) => {
          project.number = next;
        },
      }),

    title: (project: Project): Binding =>
      make({
        value: project.title,
        label: 'Project title',
        editable: project.id != null,
        write: (next) => api.projects.update(project.id!, { title: next }),
        apply: (next) => {
          project.title = next;
        },
      }),

    summary: (project: Project): Binding =>
      make({
        value: project.summary,
        label: 'Project summary',
        multiline: true,
        editable: project.id != null,
        write: (next) => api.projects.update(project.id!, { summary: next }),
        apply: (next) => {
          project.summary = next;
        },
      }),

    point: (project: Project, index: number): Binding =>
      make({
        value: project.points[index],
        label: `Bullet ${index + 1}`,
        multiline: true,
        editable: project.id != null,
        write: (next) =>
          api.projects.update(project.id!, { points: withItem(project.points, index, next) }),
        apply: (next) => {
          project.points[index] = next;
        },
      }),

    tag: (project: Project, index: number): Binding =>
      make({
        value: project.tags[index],
        label: 'Tag',
        editable: project.id != null,
        write: (next) =>
          api.projects.update(project.id!, { tags: withItem(project.tags, index, next) }),
        apply: (next) => {
          project.tags[index] = next;
        },
      }),

    image: (project: Project): Binding =>
      make({
        value: project.image,
        label: 'Screenshot',
        editable: project.id != null,
        write: (next) => api.projects.update(project.id!, { image: next }),
        apply: (next) => {
          project.image = next;
        },
      }),

    linkLabel: (project: Project): Binding =>
      make({
        value: project.linkLabel,
        label: 'Link label',
        editable: project.id != null,
        write: (next) => api.projects.update(project.id!, { link_label: next }),
        apply: (next) => {
          project.linkLabel = next;
        },
      }),
  },

  role: {
    period: (role: Role): Binding =>
      make({
        value: role.period,
        label: 'Period',
        editable: role.id != null,
        write: (next) => api.roles.update(role.id!, { period: next }),
        apply: (next) => {
          role.period = next;
        },
      }),

    title: (role: Role): Binding =>
      make({
        value: role.title,
        label: 'Role title',
        editable: role.id != null,
        write: (next) => api.roles.update(role.id!, { title: next }),
        apply: (next) => {
          role.title = next;
        },
      }),

    body: (role: Role): Binding =>
      make({
        value: role.body,
        label: 'Role description',
        multiline: true,
        editable: role.id != null,
        write: (next) => api.roles.update(role.id!, { body: next }),
        apply: (next) => {
          role.body = next;
        },
      }),
  },

  footnote: (note: Footnote): Binding =>
    make({
      value: note.text,
      label: 'Footnote',
      editable: note.id != null,
      write: (next) => api.footnotes.update(note.id!, { text: next }),
      apply: (next) => {
        note.text = next;
      },
    }),

  contact: {
    cta: (): Binding =>
      make({
        value: contact.cta,
        label: 'Button label',
        write: (next) => api.contact.update({ cta: next }),
        apply: (next) => {
          contact.cta = next;
        },
      }),
    colophon: (): Binding =>
      make({
        value: contact.colophon,
        label: 'Colophon',
        write: (next) => api.contact.update({ colophon: next }),
        apply: (next) => {
          contact.colophon = next;
        },
      }),
    place: (): Binding =>
      make({
        value: contact.place,
        label: 'Place',
        write: (next) => api.contact.update({ place: next }),
        apply: (next) => {
          contact.place = next;
        },
      }),
  },

  ask: {
    placeholder: (): Binding =>
      make({
        value: ask.placeholder,
        label: 'Ask placeholder',
        write: (next) => api.ask.update({ placeholder: next }),
        apply: (next) => {
          ask.placeholder = next;
        },
      }),
  },
};

/** Which project/stack/etc. lists exist, for the panel's section picker. */
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];
export type { SectionKey };

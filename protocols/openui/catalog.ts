// The 70-component benchmark catalog, authored the idiomatic lang-core way:
// defineComponent per component, component-typed slots as unions of child
// component .ref schemas, assembled with createLibrary. Component order is
// topological (children before the parents that reference them). The surface
// is FROZEN: signatures generated from it are baked into every committed raw.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Pinned release: the exact build that generated the frozen prompt and scored
// every committed results file. Later releases change validation verdicts.
const core = require("@openuidev/lang-core");
const { z } = require("zod/v4");

export type PropSpec = {
  t: string;
  req?: boolean;
  enum?: string[];
  allowed?: string[];
};
export type CatalogEntry = { desc: string; props: [string, PropSpec][] };
export type ComponentGroup = { name: string; components: string[]; notes: string[] };

// The benchmark scores but never renders, so components carry no renderer.
const component = (def: { name: string; description: string; props: unknown }) =>
  core.defineComponent({ ...def, component: null });

// Plain value arrays render as "(string | number)[]" in signatures; the
// benchmark surface does not distinguish item types further.
const cells = () => z.array(z.union([z.string(), z.number()]));

const TextContent = component({
  name: "TextContent",
  description:
    'Text block. Supports markdown. Optional size: "small" | "default" | "large" | "small-heavy" | "large-heavy".',
  props: z.object({
    text: z.string(),
    size: z.enum(["small", "default", "large", "small-heavy", "large-heavy"]).optional(),
  }),
});

const MarkDownRenderer = component({
  name: "MarkDownRenderer",
  description: "Renders markdown text with optional container variant",
  props: z.object({
    textMarkdown: z.string(),
    variant: z.enum(["clear", "card", "sunk"]).optional(),
  }),
});

const CardHeader = component({
  name: "CardHeader",
  description: "Header with optional title and subtitle",
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }),
});

const Callout = component({
  name: "Callout",
  description:
    "Callout banner. Optional visible is a reactive $boolean — auto-dismisses after 3s by setting $visible to false.",
  props: z.object({
    variant: z.enum(["info", "warning", "error", "success", "neutral"]),
    title: z.string(),
    description: z.string(),
  }),
});

const TextCallout = component({
  name: "TextCallout",
  description: "Text callout with variant, title, and description",
  props: z.object({
    variant: z.enum(["neutral", "info", "warning", "success", "danger"]).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

const CodeBlock = component({
  name: "CodeBlock",
  description: "Syntax-highlighted code block",
  props: z.object({
    language: z.string(),
    codeString: z.string(),
  }),
});

const Image = component({
  name: "Image",
  description: "Image with alt text and optional URL",
  props: z.object({
    alt: z.string(),
    src: z.string().optional(),
  }),
});

const ImageBlock = component({
  name: "ImageBlock",
  description: "Image block with loading state",
  props: z.object({
    src: z.string(),
    alt: z.string().optional(),
  }),
});

const ImageGallery = component({
  name: "ImageGallery",
  description: "Gallery grid of images with modal preview",
  props: z.object({
    images: cells(),
  }),
});

const Separator = component({
  name: "Separator",
  description: "Visual divider between content sections",
  props: z.object({
    orientation: z.enum(["horizontal", "vertical"]).optional(),
    decorative: z.boolean().optional(),
  }),
});

const Series = component({
  name: "Series",
  description: "One data series",
  props: z.object({
    category: z.string(),
    values: cells(),
  }),
});

const RadarChart = component({
  name: "RadarChart",
  description: "Spider/web chart; use for comparing multiple variables across one or more entities",
  props: z.object({
    labels: cells(),
    series: z.array(z.union([Series.ref])),
  }),
});

const PieChart = component({
  name: "PieChart",
  description: "Circular slices; use plucked arrays: PieChart(data.categories, data.values)",
  props: z.object({
    labels: cells(),
    values: cells(),
    variant: z.enum(["pie", "donut"]).optional(),
    appearance: z.enum(["circular", "semiCircular"]).optional(),
  }),
});

const RadialChart = component({
  name: "RadialChart",
  description: "Radial bars; use plucked arrays: RadialChart(data.categories, data.values)",
  props: z.object({
    labels: cells(),
    values: cells(),
  }),
});

const SingleStackedBarChart = component({
  name: "SingleStackedBarChart",
  description:
    "Single horizontal stacked bar; use plucked arrays: SingleStackedBarChart(data.categories, data.values)",
  props: z.object({
    labels: cells(),
    values: cells(),
  }),
});

const Point = component({
  name: "Point",
  description: "Data point with numeric coordinates",
  props: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional(),
  }),
});

const AreaChart = component({
  name: "AreaChart",
  description: "Filled area under lines; use for cumulative totals or volume trends over time",
  props: z.object({
    labels: cells(),
    series: z.array(z.union([Series.ref])),
    variant: z.enum(["linear", "natural", "step"]).optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
});

const BarChart = component({
  name: "BarChart",
  description: "Vertical bars; use for comparing values across categories with one or more series",
  props: z.object({
    labels: cells(),
    series: z.array(z.union([Series.ref])),
    variant: z.enum(["grouped", "stacked"]).optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
});

const LineChart = component({
  name: "LineChart",
  description: "Lines over categories; use for trends and continuous data over time",
  props: z.object({
    labels: cells(),
    series: z.array(z.union([Series.ref])),
    variant: z.enum(["linear", "natural", "step"]).optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
});

const Col = component({
  name: "Col",
  description: "Column definition — holds label + data array",
  props: z.object({
    label: z.string(),
    data: cells(),
    type: z.enum(["string", "number", "action"]).optional(),
  }),
});

const TagBlock = component({
  name: "TagBlock",
  description: "tags is an array of strings",
  props: z.object({
    tags: cells(),
  }),
});

const Button = component({
  name: "Button",
  description: "Clickable button",
  props: z.object({
    label: z.string(),
    action: cells().optional(),
    variant: z.enum(["primary", "secondary", "tertiary"]).optional(),
    type: z.enum(["normal", "destructive"]).optional(),
    size: z.enum(["extra-small", "small", "medium", "large"]).optional(),
  }),
});

const Input = component({
  name: "Input",
  description: "Input",
  props: z.object({
    name: z.string(),
    placeholder: z.string().optional(),
    type: z.enum(["text", "email", "password", "number", "url"]).optional(),
    rules: cells().optional(),
    value: z.string().optional(),
  }),
});

const TextArea = component({
  name: "TextArea",
  description: "TextArea",
  props: z.object({
    name: z.string(),
    placeholder: z.string().optional(),
    rows: z.number().optional(),
    rules: cells().optional(),
    value: z.string().optional(),
  }),
});

const SelectItem = component({
  name: "SelectItem",
  description: "Option for Select",
  props: z.object({
    value: z.string(),
    label: z.string(),
  }),
});

const DatePicker = component({
  name: "DatePicker",
  description: "DatePicker",
  props: z.object({
    name: z.string(),
    mode: z.enum(["single", "range"]).optional(),
    rules: cells().optional(),
    value: cells().optional(),
  }),
});

const Slider = component({
  name: "Slider",
  description: "Numeric slider input; supports continuous and discrete (stepped) variants",
  props: z.object({
    name: z.string(),
    variant: z.enum(["continuous", "discrete"]),
    min: z.number(),
    max: z.number(),
    step: z.number().optional(),
    defaultValue: cells().optional(),
    label: z.string().optional(),
    rules: cells().optional(),
    value: cells().optional(),
  }),
});

const CheckBoxItem = component({
  name: "CheckBoxItem",
  description: "CheckBoxItem",
  props: z.object({
    label: z.string(),
    description: z.string(),
    name: z.string(),
    defaultChecked: z.boolean().optional(),
  }),
});

const RadioItem = component({
  name: "RadioItem",
  description: "RadioItem",
  props: z.object({
    label: z.string(),
    description: z.string(),
    value: z.string(),
  }),
});

const StepsItem = component({
  name: "StepsItem",
  description: "title and details text for one step",
  props: z.object({
    title: z.string(),
    details: z.string(),
  }),
});

const Slice = component({
  name: "Slice",
  description: "One slice with label and numeric value",
  props: z.object({
    category: z.string(),
    value: z.number(),
  }),
});

const Label = component({
  name: "Label",
  description: "Text label",
  props: z.object({
    text: z.string(),
  }),
});

const SwitchItem = component({
  name: "SwitchItem",
  description: "Individual switch toggle",
  props: z.object({
    label: z.string().optional(),
    description: z.string().optional(),
    name: z.string(),
    defaultChecked: z.boolean().optional(),
  }),
});

const Tag = component({
  name: "Tag",
  description: "Styled tag/badge with optional icon and variant",
  props: z.object({
    text: z.string(),
    icon: z.string().optional(),
    size: z.enum(["sm", "md", "lg"]).optional(),
    variant: z.enum(["neutral", "info", "success", "warning", "danger"]).optional(),
  }),
});

const FollowUpItem = component({
  name: "FollowUpItem",
  description: "Clickable follow-up suggestion; when clicked, sends text as user message",
  props: z.object({
    text: z.string(),
  }),
});

const ListItem = component({
  name: "ListItem",
  description: "List row with a title, optional subtitle and image",
  props: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    image: cells().optional(),
    actionLabel: z.string().optional(),
  }),
});

const Alert = component({
  name: "Alert",
  description: "Alert banner with icon, title, and description",
  props: z.object({
    title: z.string(),
    description: z.string(),
    variant: z.enum(["default", "destructive", "info", "success", "warning"]).optional(),
  }),
});

const Avatar = component({
  name: "Avatar",
  description: "Avatar image with a text fallback",
  props: z.object({
    src: z.string().optional(),
    alt: z.string().optional(),
    fallback: z.string(),
  }),
});

const Badge = component({
  name: "Badge",
  description: "Small status or category badge",
  props: z.object({
    text: z.string(),
    variant: z.enum(["default", "secondary", "destructive", "outline", "ghost", "link"]).optional(),
  }),
});

const Progress = component({
  name: "Progress",
  description: "Progress bar with an optional label",
  props: z.object({
    value: z.number(),
    label: z.string().optional(),
  }),
});

const PaginationBlock = component({
  name: "PaginationBlock",
  description: "Page navigation for long result sets",
  props: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
  }),
});

const CalendarBlock = component({
  name: "CalendarBlock",
  description: "Inline calendar",
  props: z.object({
    mode: z.enum(["single", "multiple", "range"]).optional(),
    defaultMonth: z.string().optional(),
    numberOfMonths: z.number().optional(),
    captionLayout: z.enum(["label", "dropdown"]).optional(),
  }),
});

const AlertDialogBlock = component({
  name: "AlertDialogBlock",
  description: "Button that opens a confirm/cancel dialog",
  props: z.object({
    triggerLabel: z.string(),
    title: z.string(),
    description: z.string(),
    confirmLabel: z.string().optional(),
    cancelLabel: z.string().optional(),
    triggerVariant: z
      .enum(["default", "destructive", "outline", "secondary", "ghost", "link"])
      .optional(),
  }),
});

const Heading = component({
  name: "Heading",
  description: "Standalone heading",
  props: z.object({
    text: z.string(),
    level: z.enum(["h1", "h2", "h3", "h4"]).optional(),
  }),
});

const Blockquote = component({
  name: "Blockquote",
  description: "Quoted text with an optional citation",
  props: z.object({
    text: z.string(),
    cite: z.string().optional(),
  }),
});

const InlineCode = component({
  name: "InlineCode",
  description: "Inline code span",
  props: z.object({
    code: z.string(),
  }),
});

const HorizontalBarChart = component({
  name: "HorizontalBarChart",
  description: "Horizontal bars; prefer when category labels are long or for ranked lists",
  props: z.object({
    labels: cells(),
    series: z.array(z.union([Series.ref])),
    variant: z.enum(["grouped", "stacked"]).optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
});

const ScatterSeries = component({
  name: "ScatterSeries",
  description: "Named dataset",
  props: z.object({
    name: z.string(),
    points: z.array(z.union([Point.ref])),
  }),
});

const Table = component({
  name: "Table",
  description: "Data table — column-oriented. Each Col holds its own data array.",
  props: z.object({
    columns: z.array(z.union([Col.ref])),
  }),
});

const Buttons = component({
  name: "Buttons",
  description: 'Group of Button components. direction: "row" (default) | "column".',
  props: z.object({
    buttons: z.array(z.union([Button.ref])),
    direction: z.enum(["row", "column"]).optional(),
  }),
});

const Select = component({
  name: "Select",
  description: "Select",
  props: z.object({
    name: z.string(),
    items: z.array(z.union([SelectItem.ref])),
    placeholder: z.string().optional(),
    rules: cells().optional(),
    value: z.string().optional(),
    size: z.enum(["small", "medium", "large"]).optional(),
  }),
});

const CheckBoxGroup = component({
  name: "CheckBoxGroup",
  description: "CheckBoxGroup",
  props: z.object({
    name: z.string(),
    items: z.array(z.union([CheckBoxItem.ref])),
    rules: cells().optional(),
    value: cells().optional(),
  }),
});

const RadioGroup = component({
  name: "RadioGroup",
  description: "RadioGroup",
  props: z.object({
    name: z.string(),
    items: z.array(z.union([RadioItem.ref])),
    defaultValue: z.string().optional(),
    rules: cells().optional(),
    value: z.string().optional(),
  }),
});

const Steps = component({
  name: "Steps",
  description: "Step-by-step guide",
  props: z.object({
    items: z.array(z.union([StepsItem.ref])),
  }),
});

const SwitchGroup = component({
  name: "SwitchGroup",
  description: "Group of switch toggles",
  props: z.object({
    name: z.string(),
    items: z.array(z.union([SwitchItem.ref])),
    variant: z.enum(["clear", "card", "sunk"]).optional(),
    value: cells().optional(),
  }),
});

const FollowUpBlock = component({
  name: "FollowUpBlock",
  description: "List of clickable follow-up suggestions placed at the end of a response",
  props: z.object({
    items: z.array(z.union([FollowUpItem.ref])),
  }),
});

const ListBlock = component({
  name: "ListBlock",
  description: "A list of items with number or image indicators",
  props: z.object({
    items: z.array(z.union([ListItem.ref])),
    variant: z.enum(["number", "image"]).optional(),
  }),
});

const ScatterChart = component({
  name: "ScatterChart",
  description: "X/Y scatter plot; use for correlations, distributions, and clustering",
  props: z.object({
    datasets: z.array(z.union([ScatterSeries.ref])),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
});

const FormControl = component({
  name: "FormControl",
  description: "Field with label, input component, and optional hint text",
  props: z.object({
    label: z.string(),
    input: z.union([
      Input.ref,
      TextArea.ref,
      Select.ref,
      DatePicker.ref,
      Slider.ref,
      CheckBoxGroup.ref,
      RadioGroup.ref,
    ]),
    hint: z.string().optional(),
  }),
});

const Form = component({
  name: "Form",
  description: "Form container with fields and explicit action buttons",
  props: z.object({
    name: z.string(),
    buttons: Buttons.ref,
    fields: z.array(z.union([FormControl.ref])),
  }),
});

const TabItem = component({
  name: "TabItem",
  description: "value is unique id, trigger is tab label, content is array of components",
  props: z.object({
    value: z.string(),
    trigger: z.string(),
    content: z.array(
      z.union([
        TextContent.ref,
        MarkDownRenderer.ref,
        CardHeader.ref,
        Callout.ref,
        TextCallout.ref,
        CodeBlock.ref,
        Image.ref,
        ImageBlock.ref,
        ImageGallery.ref,
        Separator.ref,
        HorizontalBarChart.ref,
        RadarChart.ref,
        PieChart.ref,
        RadialChart.ref,
        SingleStackedBarChart.ref,
        ScatterChart.ref,
        AreaChart.ref,
        BarChart.ref,
        LineChart.ref,
        Table.ref,
        TagBlock.ref,
        Form.ref,
        Buttons.ref,
        Steps.ref,
      ]),
    ),
  }),
});

const Carousel = component({
  name: "Carousel",
  description: "Horizontal scrollable carousel",
  props: z.object({
    children: z.array(
      z.union([
        TextContent.ref,
        MarkDownRenderer.ref,
        CardHeader.ref,
        Callout.ref,
        TextCallout.ref,
        CodeBlock.ref,
        Image.ref,
        ImageBlock.ref,
        ImageGallery.ref,
        Separator.ref,
        HorizontalBarChart.ref,
        RadarChart.ref,
        PieChart.ref,
        RadialChart.ref,
        SingleStackedBarChart.ref,
        ScatterChart.ref,
        AreaChart.ref,
        BarChart.ref,
        LineChart.ref,
        Table.ref,
        TagBlock.ref,
        Form.ref,
        Buttons.ref,
        Steps.ref,
      ]),
    ),
    variant: z.enum(["card", "sunk"]).optional(),
  }),
});

const AccordionItem = component({
  name: "AccordionItem",
  description: "value is unique id, trigger is section title",
  props: z.object({
    value: z.string(),
    trigger: z.string(),
    content: z.array(
      z.union([
        TextContent.ref,
        MarkDownRenderer.ref,
        CardHeader.ref,
        Callout.ref,
        TextCallout.ref,
        CodeBlock.ref,
        Image.ref,
        ImageBlock.ref,
        ImageGallery.ref,
        Separator.ref,
        HorizontalBarChart.ref,
        RadarChart.ref,
        PieChart.ref,
        RadialChart.ref,
        SingleStackedBarChart.ref,
        ScatterChart.ref,
        AreaChart.ref,
        BarChart.ref,
        LineChart.ref,
        Table.ref,
        TagBlock.ref,
        Form.ref,
        Buttons.ref,
        Steps.ref,
      ]),
    ),
  }),
});

const SectionItem = component({
  name: "SectionItem",
  description: "Section with a label and collapsible content, used inside SectionBlock",
  props: z.object({
    value: z.string(),
    trigger: z.string(),
    content: z.array(
      z.union([
        TextContent.ref,
        MarkDownRenderer.ref,
        CardHeader.ref,
        Callout.ref,
        TextCallout.ref,
        CodeBlock.ref,
        Image.ref,
        ImageBlock.ref,
        ImageGallery.ref,
        Separator.ref,
        HorizontalBarChart.ref,
        RadarChart.ref,
        PieChart.ref,
        RadialChart.ref,
        SingleStackedBarChart.ref,
        ScatterChart.ref,
        AreaChart.ref,
        BarChart.ref,
        LineChart.ref,
        Table.ref,
        TagBlock.ref,
        Form.ref,
        Buttons.ref,
        Steps.ref,
        ListBlock.ref,
        FollowUpBlock.ref,
      ]),
    ),
  }),
});

const DialogBlock = component({
  name: "DialogBlock",
  description: "Button that opens a modal dialog with content",
  props: z.object({
    triggerLabel: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z
      .array(
        z.union([
          TextContent.ref,
          MarkDownRenderer.ref,
          CardHeader.ref,
          Callout.ref,
          TextCallout.ref,
          CodeBlock.ref,
          Image.ref,
          ImageBlock.ref,
          ImageGallery.ref,
          Separator.ref,
          HorizontalBarChart.ref,
          RadarChart.ref,
          PieChart.ref,
          RadialChart.ref,
          SingleStackedBarChart.ref,
          ScatterChart.ref,
          AreaChart.ref,
          BarChart.ref,
          LineChart.ref,
          Table.ref,
          TagBlock.ref,
          Form.ref,
          Buttons.ref,
          Steps.ref,
          Heading.ref,
          Blockquote.ref,
          InlineCode.ref,
          Alert.ref,
          Badge.ref,
          Avatar.ref,
          Progress.ref,
          PaginationBlock.ref,
          CalendarBlock.ref,
          ListBlock.ref,
          FollowUpBlock.ref,
        ]),
      )
      .optional(),
    triggerVariant: z
      .enum(["default", "destructive", "outline", "secondary", "ghost", "link"])
      .optional(),
  }),
});

const DrawerBlock = component({
  name: "DrawerBlock",
  description: "Button that opens a slide-out drawer with content",
  props: z.object({
    triggerLabel: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z
      .array(
        z.union([
          TextContent.ref,
          MarkDownRenderer.ref,
          CardHeader.ref,
          Callout.ref,
          TextCallout.ref,
          CodeBlock.ref,
          Image.ref,
          ImageBlock.ref,
          ImageGallery.ref,
          Separator.ref,
          HorizontalBarChart.ref,
          RadarChart.ref,
          PieChart.ref,
          RadialChart.ref,
          SingleStackedBarChart.ref,
          ScatterChart.ref,
          AreaChart.ref,
          BarChart.ref,
          LineChart.ref,
          Table.ref,
          TagBlock.ref,
          Form.ref,
          Buttons.ref,
          Steps.ref,
          Heading.ref,
          Blockquote.ref,
          InlineCode.ref,
          Alert.ref,
          Badge.ref,
          Avatar.ref,
          Progress.ref,
          PaginationBlock.ref,
          CalendarBlock.ref,
          ListBlock.ref,
          FollowUpBlock.ref,
        ]),
      )
      .optional(),
  }),
});

const Tabs = component({
  name: "Tabs",
  description: "Tabbed container",
  props: z.object({
    items: z.array(z.union([TabItem.ref])),
  }),
});

const Accordion = component({
  name: "Accordion",
  description: "Collapsible sections",
  props: z.object({
    items: z.array(z.union([AccordionItem.ref])),
  }),
});

const SectionBlock = component({
  name: "SectionBlock",
  description: "Collapsible accordion sections; use SectionItem for each section",
  props: z.object({
    sections: z.array(z.union([SectionItem.ref])),
    isFoldable: z.boolean().optional(),
  }),
});

const Card = component({
  name: "Card",
  description:
    'Styled container. variant: "card" (default, elevated) | "sunk" (recessed) | "clear" (transparent). Always full width. Accepts all Stack flex params (default: di',
  props: z.object({
    children: z.array(
      z.union([
        TextContent.ref,
        MarkDownRenderer.ref,
        CardHeader.ref,
        Callout.ref,
        TextCallout.ref,
        CodeBlock.ref,
        Image.ref,
        ImageBlock.ref,
        ImageGallery.ref,
        Separator.ref,
        HorizontalBarChart.ref,
        RadarChart.ref,
        PieChart.ref,
        RadialChart.ref,
        SingleStackedBarChart.ref,
        ScatterChart.ref,
        AreaChart.ref,
        BarChart.ref,
        LineChart.ref,
        Table.ref,
        TagBlock.ref,
        Form.ref,
        Buttons.ref,
        Steps.ref,
        Tabs.ref,
        Carousel.ref,
        SectionBlock.ref,
        DialogBlock.ref,
        DrawerBlock.ref,
        AlertDialogBlock.ref,
        Heading.ref,
        Blockquote.ref,
        InlineCode.ref,
        Alert.ref,
        Badge.ref,
        Avatar.ref,
        Progress.ref,
        PaginationBlock.ref,
        CalendarBlock.ref,
        ListBlock.ref,
        FollowUpBlock.ref,
      ]),
    ),
    variant: z.enum(["card", "sunk", "clear"]).optional(),
    direction: z.enum(["row", "column"]).optional(),
    gap: z.enum(["none", "xs", "s", "m", "l", "xl", "2xl"]).optional(),
    align: z.enum(["start", "center", "end", "stretch", "baseline"]).optional(),
    justify: z.enum(["start", "center", "end", "between", "around", "evenly"]).optional(),
    wrap: z.boolean().optional(),
  }),
});

const COMPONENTS = [
  TextContent,
  MarkDownRenderer,
  CardHeader,
  Callout,
  TextCallout,
  CodeBlock,
  Image,
  ImageBlock,
  ImageGallery,
  Separator,
  Series,
  RadarChart,
  PieChart,
  RadialChart,
  SingleStackedBarChart,
  Point,
  AreaChart,
  BarChart,
  LineChart,
  Col,
  TagBlock,
  Button,
  Input,
  TextArea,
  SelectItem,
  DatePicker,
  Slider,
  CheckBoxItem,
  RadioItem,
  StepsItem,
  Slice,
  Label,
  SwitchItem,
  Tag,
  FollowUpItem,
  ListItem,
  Alert,
  Avatar,
  Badge,
  Progress,
  PaginationBlock,
  CalendarBlock,
  AlertDialogBlock,
  Heading,
  Blockquote,
  InlineCode,
  HorizontalBarChart,
  ScatterSeries,
  Table,
  Buttons,
  Select,
  CheckBoxGroup,
  RadioGroup,
  Steps,
  SwitchGroup,
  FollowUpBlock,
  ListBlock,
  ScatterChart,
  FormControl,
  Form,
  TabItem,
  Carousel,
  AccordionItem,
  SectionItem,
  DialogBlock,
  DrawerBlock,
  Tabs,
  Accordion,
  SectionBlock,
  Card,
];

export const ROOT = "Card";

export const componentGroups: ComponentGroup[] = [
  {
    name: "Root and layout",
    components: [
      "Card",
      "Tabs",
      "TabItem",
      "Accordion",
      "AccordionItem",
      "Steps",
      "StepsItem",
      "Carousel",
    ],
    notes: [
      "- Card is the root. Everything the user should see must hang off its children list, in reading order.",
      "- Tabs, Accordion and Steps take item references. Define each item on its own line instead of inlining the whole array.",
      "- Every slide of a Carousel must repeat the same component sequence.",
    ],
  },
  {
    name: "Content",
    components: [
      "CardHeader",
      "Heading",
      "TextContent",
      "MarkDownRenderer",
      "Blockquote",
      "InlineCode",
      "CodeBlock",
      "Image",
      "ImageBlock",
      "ImageGallery",
      "Separator",
    ],
    notes: [
      "- Name a section once. A CardHeader followed by a heading that repeats the same words is duplication.",
      "- MarkDownRenderer is for prose that carries its own structure; TextContent is for one short passage.",
      "- Use real, publicly reachable image URLs (e.g. https://picsum.photos/seed/KEYWORD/800/500). Never invent one.",
    ],
  },
  {
    name: "Status and labels",
    components: [
      "Callout",
      "TextCallout",
      "Alert",
      "Badge",
      "Tag",
      "TagBlock",
      "Progress",
      "Avatar",
    ],
    notes: [
      "- Callout, TextCallout and Alert carry a message that needs attention. Badge and Tag label a value in place and carry no message.",
      "- Status colors live on Tag (success, warning, info, danger), TextCallout (success, warning, info, danger), Callout (success, warning, info, error) and Alert (success, warning, info, destructive) variants. Badge and Button variants are visual styles from their signatures only: Badge has no success or warning, Button has no ghost.",
      "- Progress shows one value against its whole. Several values compared against each other belong in a chart.",
    ],
  },
  {
    name: "Collections",
    components: [
      "ListBlock",
      "ListItem",
      "SectionBlock",
      "SectionItem",
      "FollowUpBlock",
      "FollowUpItem",
      "PaginationBlock",
    ],
    notes: [
      "- Use ListBlock when each entry is a title plus a line of detail. Use a table when every entry shares the same fields.",
      "- SectionBlock groups long content into collapsible sections; each SectionItem needs a unique value id and holds content components.",
      "- FollowUpBlock belongs at the very end and holds suggested next messages, not controls for the current screen.",
    ],
  },
  {
    name: "Tables",
    components: ["Table", "Col"],
    notes: [
      "- Table is column-oriented: each Col carries the whole data array for its column, so every Col in a table must hold the same number of values.",
      "- A handful of unrelated facts is not a table. Reach for one only when entries share the same fields.",
    ],
  },
  {
    name: "Charts (2D)",
    components: [
      "BarChart",
      "LineChart",
      "AreaChart",
      "HorizontalBarChart",
      "RadarChart",
      "Series",
    ],
    notes: [
      "- labels holds one entry per position on the category axis; each Series holds one value per label, in the same order.",
      "- Pick by the question: compare categories, follow a trend over time, show accumulation, rank long-named categories, or compare several measures for a few entities.",
    ],
  },
  {
    name: "Charts (1D)",
    components: ["PieChart", "RadialChart", "SingleStackedBarChart", "Slice"],
    notes: [
      "- These take two parallel arrays, labels and values in matching order, and show parts of one whole. They cannot show a trend.",
    ],
  },
  {
    name: "Charts (scatter)",
    components: ["ScatterChart", "ScatterSeries", "Point"],
    notes: [
      "- Use a scatter plot for the relationship between two numeric measures. Each ScatterSeries is one named group of Points.",
    ],
  },
  {
    name: "Forms",
    components: [
      "Form",
      "FormControl",
      "Label",
      "Input",
      "TextArea",
      "Select",
      "SelectItem",
      "DatePicker",
      "CalendarBlock",
      "Slider",
      "CheckBoxGroup",
      "CheckBoxItem",
      "RadioGroup",
      "RadioItem",
      "SwitchGroup",
      "SwitchItem",
    ],
    notes: [
      "- Define EACH FormControl as its own reference. Do NOT inline every control in one array.",
      "- A FormControl wraps exactly one input: Input, TextArea, Select, DatePicker, Slider, CheckBoxGroup or RadioGroup.",
      "- Form requires explicit buttons. Always pass a Buttons(...) reference as the second Form argument, and NEVER nest a Form inside a Form.",
    ],
  },
  {
    name: "Buttons",
    components: ["Button", "Buttons"],
    notes: [
      "- A Button with no action sends its label back as a user message, which is what most screens want.",
      "- Group related buttons in one Buttons reference rather than scattering loose Button references.",
    ],
  },
  {
    name: "Overlays",
    components: ["DialogBlock", "DrawerBlock", "AlertDialogBlock"],
    notes: [
      "- An overlay hides its content behind a trigger. Anything the user must see at a glance belongs on the screen itself.",
      "- AlertDialogBlock is for a confirm-or-cancel decision; DialogBlock and DrawerBlock hold arbitrary content components.",
    ],
  },
];

export const LIBRARY = core.createLibrary({
  components: COMPONENTS,
  root: ROOT,
  componentGroups,
});

// The flat surface tools/check-catalogs.ts compares across protocols. Derived
// from the same authored components the prompt is generated from, so the two
// cannot drift. .ref IS the referenced component's props schema, so slot
// targets resolve by object identity.
const nameByProps = new Map<unknown, string>(COMPONENTS.map((c: any) => [c.props, c.name]));
const def = (schema: any): any => schema?._zod?.def;

function deriveProp(schema: any): PropSpec {
  let node = schema;
  let req = true;
  if (def(node)?.type === "optional") {
    req = false;
    node = def(node).innerType;
  }
  const mk = (t: string, extra: Partial<PropSpec> = {}): PropSpec =>
    req ? ({ t, req: true, ...extra } as PropSpec) : ({ t, ...extra } as PropSpec);
  const d = def(node);
  if (nameByProps.has(node)) return mk("ref", { allowed: [nameByProps.get(node)!] });
  switch (d?.type) {
    case "enum":
      return mk("string", { enum: Object.values(d.entries) as string[] });
    case "string":
      return mk("string");
    case "number":
      return mk("number");
    case "boolean":
      return mk("boolean");
    case "union": {
      const names = d.options.map((o: any) => nameByProps.get(o)).filter(Boolean) as string[];
      if (names.length === d.options.length) return mk("ref", { allowed: names });
      return mk("array");
    }
    case "array": {
      const inner = d.element;
      const innerDef = def(inner);
      if (nameByProps.has(inner)) return mk("refs", { allowed: [nameByProps.get(inner)!] });
      if (innerDef?.type === "union") {
        const names = innerDef.options
          .map((o: any) => nameByProps.get(o))
          .filter(Boolean) as string[];
        if (names.length === innerDef.options.length) return mk("refs", { allowed: names });
      }
      return mk("array");
    }
    default:
      throw new Error("unhandled zod kind: " + d?.type);
  }
}

function toCatalog(components: any[]) {
  const out: Record<string, CatalogEntry> = {};
  for (const c of components) {
    out[c.name] = {
      desc: c.description,
      props: Object.entries(def(c.props).shape).map(
        ([name, schema]) => [name, deriveProp(schema)] as [string, PropSpec],
      ),
    };
  }
  return out;
}

function checkGroups(groups: ComponentGroup[], catalog: Record<string, CatalogEntry>) {
  const listed = groups.flatMap((g) => g.components);
  const unknown = listed.filter((n) => !catalog[n]);
  const duplicate = listed.filter((n, i) => listed.indexOf(n) !== i);
  const ungrouped = Object.keys(catalog).filter((n) => !listed.includes(n));
  if (unknown.length || duplicate.length || ungrouped.length)
    throw new Error(
      `componentGroups out of sync: unknown=[${unknown}] duplicate=[${duplicate}] ungrouped=[${ungrouped}]`,
    );
  return groups;
}

export const CATALOG: Record<string, CatalogEntry> = toCatalog(COMPONENTS);

export const COMPONENT_GROUPS: ComponentGroup[] = checkGroups(componentGroups, CATALOG);

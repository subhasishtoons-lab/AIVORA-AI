import {
  Briefcase,
  Code2,
  GraduationCap,
  Image,
  Layers,
  Megaphone,
  MessageSquare,
  Music,
  PenTool,
  Sparkles,
  Video,
} from 'lucide-react';

export function CategoryIcon({
  iconKey,
  className = 'h-5 w-5',
}: {
  iconKey: string;
  className?: string;
}) {
  switch (iconKey) {
    case 'PenTool':
      return <PenTool className={className} aria-hidden="true" />;
    case 'Image':
      return <Image className={className} aria-hidden="true" />;
    case 'Video':
      return <Video className={className} aria-hidden="true" />;
    case 'Music':
      return <Music className={className} aria-hidden="true" />;
    case 'Code2':
      return <Code2 className={className} aria-hidden="true" />;
    case 'Layers':
      return <Layers className={className} aria-hidden="true" />;
    case 'Megaphone':
      return <Megaphone className={className} aria-hidden="true" />;
    case 'Briefcase':
      return <Briefcase className={className} aria-hidden="true" />;
    case 'GraduationCap':
      return <GraduationCap className={className} aria-hidden="true" />;
    case 'MessageSquare':
      return <MessageSquare className={className} aria-hidden="true" />;
    default:
      return <Sparkles className={className} aria-hidden="true" />;
  }
}

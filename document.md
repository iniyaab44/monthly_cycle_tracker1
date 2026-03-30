# Technical Documentation: Monthly Cycle 🌻

## 1. Introduction
**Monthly Cycle** is a full-stack web application designed to empower users in tracking their menstrual health and medication adherence. The project's primary objective is to provide a highly legible, visually distinct, and secure platform for personal health data management.

By leveraging a **Neubrutalist** design aesthetic, the application breaks away from traditional, soft-toned wellness apps, offering a bold and high-contrast interface that prioritizes information density and clear visual hierarchy.

## 2. Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- A Supabase account and project
- A Google Cloud project (if deploying to Cloud Run)

### Local Development Steps
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd monthly-cycle
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add the following variables (refer to `.env.example`):
   ```env
   JWT_SECRET="your_secret_key"
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 3. Theme & Visual Identity

### The Neubrutalism Aesthetic
The application utilizes **Neubrutalism**, a modern evolution of the Brutalist design movement. This style is characterized by:
- **Thick Black Borders**: `border-4 border-black` is used on all primary cards and buttons.
- **Hard Shadows**: `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]` creates a 3D effect without using gradients or blurs.
- **Vibrant Colors**: A palette of high-saturation colors (Red, Gold, Green) on a clean white background.
- **Bold Typography**: Heavy use of `font-black` and `uppercase` for headings and labels.

### Color Palette
| Category | Color Code | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Period Day** | `#FF4444` | `bg-[#FF4444]` | Menstrual cycle tracking |
| **Pill Taken** | `#FFD700` | `bg-[#FFD700]` | Medication adherence |
| **Free Day**   | `#4CAF50` | `bg-[#4CAF50]` | Normal status |
| **Accent**     | `#f5f2ed` | `bg-sandel` | Hover states and highlights |
| **Base**       | `#FFFFFF` | `bg-white` | Primary card backgrounds |

## 4. Implementation Details

### Frontend Architecture
- **React 18**: Used for building a component-based, reactive user interface.
- **Tailwind CSS**: Utility-first styling for rapid implementation of the Neubrutalist theme.
- **Lucide React**: A consistent set of vector icons for intuitive navigation.
- **Recharts**: Data visualization for monthly health trends.

### Backend & Security
- **Express.js**: A lightweight Node.js framework for the API layer.
- **Supabase**: A PostgreSQL-based backend-as-a-service for data persistence.
- **JWT Authentication**: Secure user sessions using JSON Web Tokens.
- **Row Level Security (RLS)**: Database-level policies to ensure data isolation between users.

## 5. Extra Tips & Best Practices

### Data Security
- **Always use the Service Role Key on the backend**: This ensures that your server can reliably fetch and update data even when strict RLS policies are in place.
- **Never expose the Service Role Key on the frontend**: This key bypasses security rules and should remain strictly on the server.

### Maintenance
- **Regular Exports**: Encourage users to use the PDF/Excel export feature to keep offline backups of their health history.
- **Responsive Design**: The application is optimized for both desktop and mobile. When making UI changes, always test with Tailwind's `md:` and `lg:` prefixes to ensure a consistent experience across devices.

### Performance
- **Lazy Loading**: For larger datasets, consider implementing pagination or infinite scrolling for the Activity Log to maintain high performance.

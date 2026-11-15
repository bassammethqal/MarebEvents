-- ==============================================================================
-- Migration: 20261030000001_concurrency_and_unit_integrity.sql
-- Group 1: Concurrency & Unit Integrity — حماية الحجوزات ومنع التعارض وإدارة الأقسام
-- Target: Supabase / PostgreSQL 15+\n-- Revised copy: static hardening pass; apply only after comparing with prior schema/migrations.
-- ==============================================================================

-- 1. تفعيل الامتدادات الأساسية
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. نوع حالة الحجز الموحد (Unified Booking Status ENUM)
DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM (
        'pending_payment',
        'pending_owner_approval',
        'confirmed',
        'completed',
        'cancelled_by_customer',
        'cancelled_by_owner',
        'expired',
        'rejected',
        'owner_review_timed_out'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. تسلسل توليد الأرقام المرجعية للحجوزات (Sequence)
CREATE SEQUENCE IF NOT EXISTS public.booking_ref_seq START WITH 1001 INCREMENT BY 1;

-- 4. جدول الملفات الشخصية (الحد الأدنى المطلوب لربط المستخدمين والعملاء)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'owner', 'admin')),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 5. جدول تصنيفات المنشآت
CREATE TABLE IF NOT EXISTS public.venue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    description_ar TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 6. جدول سياسات الإلغاء
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 7. جدول المنشآت الأساسية
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.venue_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    city TEXT NOT NULL DEFAULT 'مأرب',
    district TEXT NOT NULL,
    address_details TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contact_phone TEXT NOT NULL,
    contact_whatsapp TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_verification', 'active', 'suspended', 'archived')),
    cancellation_policy_id UUID REFERENCES public.cancellation_policies(id) ON DELETE SET NULL,
    default_currency TEXT NOT NULL DEFAULT 'YER' CHECK (default_currency IN ('YER', 'SAR', 'USD')),
    default_deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 30.00 CHECK (default_deposit_percentage BETWEEN 0 AND 100),
    has_multiple_units BOOLEAN NOT NULL DEFAULT false,
    featured BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 8. جدول أقسام ووحدات المنشأة (مع القيد المركب الأساسي uq_venue_units_venue_id_id)
CREATE TABLE IF NOT EXISTS public.venue_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('women_section', 'men_section', 'dining_hall', 'full_venue', 'chalet_unit')),
    capacity_min INTEGER NOT NULL DEFAULT 0 CHECK (capacity_min >= 0),
    capacity_max INTEGER NOT NULL CHECK (capacity_max > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_venue_units_venue_id_id UNIQUE (venue_id, id),
    CONSTRAINT chk_unit_capacity_range CHECK (capacity_max >= capacity_min)
);

-- 9. جدول عضوية وطاقم المنشأة
CREATE TABLE IF NOT EXISTS public.venue_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    role TEXT NOT NULL CHECK (role IN ('primary_owner', 'co_owner', 'manager', 'receptionist')),
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_venue_members_venue_user UNIQUE (venue_id, user_id)
);

-- 10. دالة مساعدة لفحص صلاحية عضوية المنشأة
CREATE OR REPLACE FUNCTION public.has_venue_access(
  v_id UUID, 
  required_roles TEXT[] DEFAULT ARRAY['primary_owner', 'co_owner', 'manager']
)
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venue_members vm
    JOIN public.profiles p ON p.id = vm.user_id
    WHERE vm.venue_id = v_id 
      AND vm.user_id = auth.uid() 
      AND p.is_active = true
      AND vm.role = ANY(required_roles)
  );
$$;

-- دالة مساعدة للتحقق من صفة مدير النظام (Admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
  );
$$;


-- منع المستخدم من تغيير role أو is_active بنفسه؛ هذه الحقول إدارية فقط.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND auth.uid() = OLD.id
       AND NOT public.is_admin()
       AND (
           NEW.role IS DISTINCT FROM OLD.role
           OR NEW.is_active IS DISTINCT FROM OLD.is_active
       ) THEN
        RAISE EXCEPTION 'لا يمكن للمستخدم تعديل صلاحيات الحساب أو حالة تفعيله.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 11. جدول الإتاحة والاستثناءات المخصصة للمنشأة (مع القيد المركب)
CREATE TABLE IF NOT EXISTS public.venue_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    unit_id UUID,
    override_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'evening', 'full_day')),
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    custom_price NUMERIC(14,2) CHECK (custom_price >= 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT fk_venue_availability_venue_unit FOREIGN KEY (venue_id, unit_id) REFERENCES public.venue_units(venue_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_availability_unique_rule
ON public.venue_availability (venue_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid), override_date, shift);

-- 12. جدول خطط الأسعار (مع القيد المركب)
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    unit_id UUID,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'evening', 'full_day')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    is_seasonal BOOLEAN NOT NULL DEFAULT false,
    season_start DATE,
    season_end DATE,
    price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT fk_pricing_tiers_venue_unit FOREIGN KEY (venue_id, unit_id) REFERENCES public.venue_units(venue_id, id) ON DELETE CASCADE,
    CONSTRAINT chk_pricing_season_range CHECK (
        (is_seasonal = false) OR 
        (is_seasonal = true AND season_start IS NOT NULL AND season_end IS NOT NULL AND season_end >= season_start)
    )
);

-- 13. جدول الخدمات والمرافق المرجعية
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    icon_name TEXT,
    category TEXT NOT NULL CHECK (category IN ('general', 'entertainment', 'hospitality')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 14. جدول ربط مرافق المنشأة
CREATE TABLE IF NOT EXISTS public.venue_amenities (
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    is_free BOOLEAN NOT NULL DEFAULT true,
    additional_price NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (additional_price >= 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    PRIMARY KEY (venue_id, amenity_id)
);

-- تحويل التاريخ إلى توقيت اليمن. الدالة STABLE لأن قواعد المناطق الزمنية قد تتغير.
CREATE OR REPLACE FUNCTION public.timestamptz_to_yemen_date(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT (ts AT TIME ZONE 'Asia/Aden')::date;
$$;

-- 15. جدول الحجوزات الرئيسي (مع المفتاح المركب uq_bookings_id_venue_id والقيود الصارمة)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT UNIQUE NOT NULL,
    idempotency_key UUID,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    booking_source TEXT NOT NULL DEFAULT 'online' CHECK (booking_source IN ('online', 'manual_owner')),
    is_full_venue BOOLEAN NOT NULL DEFAULT false,
    event_type TEXT NOT NULL CHECK (event_type IN ('wedding', 'engagement', 'seminar', 'family_gathering', 'recreation', 'other')),
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    event_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'evening', 'full_day')),
    time_slot TSTZRANGE NOT NULL,
    status public.booking_status NOT NULL DEFAULT 'pending_payment',
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    deposit_amount NUMERIC(14,2) NOT NULL CHECK (deposit_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
    cancellation_policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    customer_notes TEXT,
    owner_private_notes TEXT,
    expires_at TIMESTAMPTZ,
    owner_review_expires_at TIMESTAMPTZ,
    admin_escalation_expires_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_bookings_id_venue_id UNIQUE (id, venue_id),
    CONSTRAINT uq_bookings_customer_idempotency UNIQUE (customer_id, idempotency_key),
    CONSTRAINT chk_booking_time_slot_sanity CHECK (
        NOT isempty(time_slot) AND
        lower_inc(time_slot) AND NOT upper_inc(time_slot) AND
        lower(time_slot) < upper(time_slot) AND
        (upper(time_slot) - lower(time_slot)) <= interval '24 hours'
    ),
    CONSTRAINT chk_deposit_not_exceed_total CHECK (deposit_amount <= total_amount)
);

-- التحقق من مطابقة تاريخ المناسبة لتاريخ بداية الفترة حسب توقيت اليمن.
-- Trigger مناسب هنا لأن تحويل timestamptz عبر قواعد المناطق الزمنية ليس IMMUTABLE.
CREATE OR REPLACE FUNCTION public.validate_booking_yemen_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF public.timestamptz_to_yemen_date(pg_catalog.lower(NEW.time_slot)) IS DISTINCT FROM NEW.event_date THEN
        RAISE EXCEPTION 'تاريخ المناسبة لا يطابق تاريخ بداية الفترة حسب توقيت اليمن.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_yemen_date ON public.bookings;
CREATE TRIGGER trg_validate_booking_yemen_date
BEFORE INSERT OR UPDATE OF event_date, time_slot ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_yemen_date();

-- 16. جدول الأقسام المطلوبة في الحجز (مع المفاتيح الأجنبية المركبة المثلثية)
CREATE TABLE IF NOT EXISTS public.booking_requested_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    venue_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT fk_req_units_booking_venue FOREIGN KEY (booking_id, venue_id) REFERENCES public.bookings(id, venue_id) ON DELETE CASCADE,
    CONSTRAINT fk_req_units_unit_venue FOREIGN KEY (venue_id, unit_id) REFERENCES public.venue_units(venue_id, id) ON DELETE RESTRICT,
    CONSTRAINT uq_booking_requested_unit UNIQUE (booking_id, unit_id)
);

-- 17. جدول الفتحات الزمنية المحجوزة فعلياً (رأس حربة منع التضارب)
CREATE TABLE IF NOT EXISTS public.booking_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    venue_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    time_slot TSTZRANGE NOT NULL,
    status public.booking_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT fk_slots_booking_venue FOREIGN KEY (booking_id, venue_id) REFERENCES public.bookings(id, venue_id) ON DELETE CASCADE,
    CONSTRAINT fk_slots_unit_venue FOREIGN KEY (venue_id, unit_id) REFERENCES public.venue_units(venue_id, id) ON DELETE RESTRICT,
    CONSTRAINT prevent_unit_slot_overlap EXCLUDE USING gist (
        unit_id WITH =,
        time_slot WITH &&
    ) WHERE (status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out'))
);

-- 18. جدول بيانات ضيوف الحجز المكتبي المعزولة
CREATE TABLE IF NOT EXISTS public.booking_guest_details (
    booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- 19. جدول بنود تفاصيل السعر
CREATE TABLE IF NOT EXISTS public.booking_price_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('unit_rate', 'full_venue_rate', 'extra_service', 'discount', 'custom_override')),
    description_ar TEXT NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_price NUMERIC(14,2) NOT NULL CHECK (total_price >= 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_price_item_total_match CHECK (total_price = (unit_price * quantity))
);

-- 20. جدول الخدمات الإضافية المحجوزة
CREATE TABLE IF NOT EXISTS public.booking_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES public.amenities(id) ON DELETE SET NULL,
    name_ar TEXT NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_price NUMERIC(14,2) NOT NULL CHECK (total_price >= 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_booking_extras_total CHECK (total_price = (unit_price * quantity))
);

-- 21. جدول سجل تدقيق الحجوزات
CREATE TABLE IF NOT EXISTS public.booking_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    from_status public.booking_status,
    to_status public.booking_status NOT NULL,
    action_description TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- ==============================================================================
-- 22. التريغرات والإجراءات الحاكمة للمجموعة الأولى
-- ==============================================================================

-- أ. تريغر إنشاء القسم الافتراضي للمنشآت الموحدة غير المقسمة تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_venue_default_unit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.has_multiple_units = false THEN
        INSERT INTO public.venue_units (venue_id, name, unit_type, capacity_min, capacity_max, is_active)
        VALUES (NEW.id, 'المنشأة بالكامل', 'full_venue', 0, 1000, true);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_venue_unit ON public.venues;
CREATE TRIGGER trg_create_default_venue_unit
AFTER INSERT ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.handle_new_venue_default_unit();

-- ب. تريغر منع تفعيل أو نشر المنشأة إذا لم تكن تحتوي على قسم نشط
CREATE OR REPLACE FUNCTION public.validate_venue_activation_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        RAISE EXCEPTION 'تعذر إنشاء المنشأة: لا يمكن إنشاء المنشأة بحالة نشطة مباشرة؛ يجب حفظها كمسودة وإضافة أقسامها أولاً.';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.venue_units 
            WHERE venue_id = NEW.id AND is_active = true
        ) THEN
            RAISE EXCEPTION 'تعذر تنشيط المنشأة: يجب إضافة وتفعيل قسم واحد على الأقل صالح للحجز أولاً.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_venue_units_before_active ON public.venues;
CREATE TRIGGER trg_check_venue_units_before_active
BEFORE INSERT OR UPDATE OF status ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.validate_venue_activation_units();

-- ج. دالة إدارة وتعديل الأقسام المحصنة بقفل المنشأة المسبق (manage_venue_unit)
CREATE OR REPLACE FUNCTION public.manage_venue_unit(
    p_venue_id UUID,
    p_unit_id UUID,
    p_action TEXT,
    p_name TEXT DEFAULT NULL,
    p_unit_type TEXT DEFAULT NULL,
    p_capacity_min INTEGER DEFAULT NULL,
    p_capacity_max INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target_unit_id UUID := p_unit_id;
    v_current_unit RECORD;
    v_booking RECORD;
    v_has_future_bookings BOOLEAN;
BEGIN
    -- 1. التحقق من الصلاحيات
    IF NOT (public.has_venue_access(p_venue_id, ARRAY['primary_owner', 'co_owner'])) THEN
        -- تحقق إضافي في حال كان المتصل Admin
        IF NOT (public.is_admin()) THEN
            RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية تعديل أقسام هذه المنشأة.';
        END IF;
    END IF;

    -- 2. قفل المنشأة FOR UPDATE كأول خطوة لمنع أي سباق أو Deadlock
    PERFORM id FROM public.venues WHERE id = p_venue_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'المنشأة المحددة غير موجودة.';
    END IF;

    -- 3. في حال التعديل: التحقق من وجود القسم وملكيته للمنشأة
    IF p_action IN ('UPDATE_INFO', 'ACTIVATE', 'DEACTIVATE', 'SOFT_DELETE') THEN
        IF p_unit_id IS NULL THEN
            RAISE EXCEPTION 'معرف القسم مطلوب لتنفيذ هذا الإجراء.';
        END IF;

        SELECT id, is_active INTO v_current_unit
        FROM public.venue_units
        WHERE id = p_unit_id AND venue_id = p_venue_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'القسم غير موجود أو لا ينتمي إلى هذه المنشأة.';
        END IF;
    END IF;

    -- أ. مسار الإضافة (CREATE)
    IF p_action = 'CREATE' THEN
        IF p_name IS NULL OR p_unit_type IS NULL OR p_capacity_max IS NULL THEN
            RAISE EXCEPTION 'بيانات القسم الأساسية إلزامية للإضافة.';
        END IF;

        INSERT INTO public.venue_units (
            venue_id, name, unit_type, capacity_min, capacity_max, is_active
        ) VALUES (
            p_venue_id, p_name, p_unit_type, COALESCE(p_capacity_min, 0), p_capacity_max, true
        ) RETURNING id INTO v_target_unit_id;

        -- التحديث الرجعي لكافة الحجوزات الكاملة المستقبلية
        FOR v_booking IN 
            SELECT b.id, b.booking_reference, b.time_slot, b.status 
            FROM public.bookings b
            WHERE b.venue_id = p_venue_id 
              AND b.is_full_venue = true 
              AND b.status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
              AND pg_catalog.upper(b.time_slot) > pg_catalog.now()
        LOOP
            INSERT INTO public.booking_requested_units (booking_id, venue_id, unit_id)
            VALUES (v_booking.id, p_venue_id, v_target_unit_id);

            -- إدراج الفتحة بدون DO NOTHING؛ ليعترض قيد GIST في حال أي تضارب حقيقي
            INSERT INTO public.booking_slots (booking_id, venue_id, unit_id, time_slot, status)
            VALUES (v_booking.id, p_venue_id, v_target_unit_id, v_booking.time_slot, v_booking.status);
        END LOOP;

    -- ب. مسار تعديل البيانات العادية (UPDATE_INFO)
    ELSIF p_action = 'UPDATE_INFO' THEN
        IF EXISTS (
            SELECT 1
            FROM public.booking_slots bs
            WHERE bs.venue_id = p_venue_id
              AND bs.unit_id = p_unit_id
              AND bs.status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
              AND pg_catalog.upper(bs.time_slot) > pg_catalog.now()
        ) AND (
            (p_unit_type IS NOT NULL AND p_unit_type IS DISTINCT FROM (SELECT unit_type FROM public.venue_units WHERE id = p_unit_id))
            OR (p_capacity_min IS NOT NULL AND p_capacity_min IS DISTINCT FROM (SELECT capacity_min FROM public.venue_units WHERE id = p_unit_id))
            OR (p_capacity_max IS NOT NULL AND p_capacity_max IS DISTINCT FROM (SELECT capacity_max FROM public.venue_units WHERE id = p_unit_id))
        ) THEN
            RAISE EXCEPTION 'لا يمكن تغيير نوع القسم أو سعته مع وجود حجوزات مستقبلية نشطة.';
        END IF;

        UPDATE public.venue_units
        SET name = COALESCE(p_name, name),
            unit_type = COALESCE(p_unit_type, unit_type),
            capacity_min = COALESCE(p_capacity_min, capacity_min),
            capacity_max = COALESCE(p_capacity_max, capacity_max),
            updated_at = pg_catalog.now()
        WHERE id = p_unit_id AND venue_id = p_venue_id;

    -- ج. مسار إعادة التفعيل (ACTIVATE)
    ELSIF p_action = 'ACTIVATE' THEN
        IF v_current_unit.is_active = true THEN
            RETURN v_target_unit_id;
        END IF;

        UPDATE public.venue_units
        SET is_active = true, updated_at = pg_catalog.now()
        WHERE id = p_unit_id AND venue_id = p_venue_id;

        -- تشغيل التحديث الرجعي الذري عند الانتقال من false إلى true
        FOR v_booking IN 
            SELECT b.id, b.booking_reference, b.time_slot, b.status 
            FROM public.bookings b
            WHERE b.venue_id = p_venue_id 
              AND b.is_full_venue = true 
              AND b.status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
              AND pg_catalog.upper(b.time_slot) > pg_catalog.now()
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.booking_slots 
                WHERE booking_id = v_booking.id AND unit_id = p_unit_id
            ) THEN
                INSERT INTO public.booking_requested_units (booking_id, venue_id, unit_id)
                VALUES (v_booking.id, p_venue_id, p_unit_id);

                INSERT INTO public.booking_slots (booking_id, venue_id, unit_id, time_slot, status)
                VALUES (v_booking.id, p_venue_id, p_unit_id, v_booking.time_slot, v_booking.status);
            END IF;
        END LOOP;

    -- د. مسار التعطيل (DEACTIVATE)
    ELSIF p_action = 'DEACTIVATE' THEN
        IF (SELECT count(*) FROM public.venue_units
            WHERE venue_id = p_venue_id AND is_active = true) <= 1 THEN
            RAISE EXCEPTION 'يجب أن تحتوي المنشأة على قسم نشط واحد على الأقل.';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.booking_slots bs
            WHERE bs.venue_id = p_venue_id
              AND bs.unit_id = p_unit_id
              AND bs.status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
              AND pg_catalog.upper(bs.time_slot) > pg_catalog.now()
        ) INTO v_has_future_bookings;

        IF v_has_future_bookings THEN
            RAISE EXCEPTION 'تعذر تعطيل القسم: توجد حجوزات مستقبلية نشطة أو معلقة مرتبطة بهذا القسم.';
        END IF;

        UPDATE public.venue_units
        SET is_active = false, updated_at = pg_catalog.now()
        WHERE id = p_unit_id AND venue_id = p_venue_id;

    -- هـ. مسار الحذف المنطقي (SOFT_DELETE)
    ELSIF p_action = 'SOFT_DELETE' THEN
        IF v_current_unit.is_active = true
           AND (SELECT count(*) FROM public.venue_units
                WHERE venue_id = p_venue_id AND is_active = true) <= 1 THEN
            RAISE EXCEPTION 'لا يمكن أرشفة آخر قسم نشط في المنشأة.';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.booking_slots bs
            WHERE bs.venue_id = p_venue_id
              AND bs.unit_id = p_unit_id
              AND bs.status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
              AND pg_catalog.upper(bs.time_slot) > pg_catalog.now()
        ) INTO v_has_future_bookings;

        IF v_has_future_bookings THEN
            RAISE EXCEPTION 'تعذر حذف القسم: توجد حجوزات مستقبلية نشطة مرتبطة بهذا القسم.';
        END IF;

        UPDATE public.venue_units
        SET is_active = false,
            deleted_at = pg_catalog.now(),
            updated_at = pg_catalog.now()
        WHERE id = p_unit_id AND venue_id = p_venue_id;

    ELSE
        RAISE EXCEPTION 'نوع الإجراء المحدد غير صالح.';
    END IF;

    RETURN v_target_unit_id;
END;
$$;

-- د. تريغر تجميد الحقول التأسيسية ومنع التعديل المباشر على الحجوزات
CREATE OR REPLACE FUNCTION public.enforce_booking_immutability_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.id <> OLD.id OR 
       NEW.venue_id <> OLD.venue_id OR 
       NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
       NEW.booking_reference <> OLD.booking_reference OR
       NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
       NEW.is_full_venue <> OLD.is_full_venue OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'غير مسموح: لا يمكن تعديل الحقول التأسيسية للحجز بعد إنشائه.';
    END IF;

    IF (NEW.time_slot IS DISTINCT FROM OLD.time_slot OR NEW.event_date <> OLD.event_date) THEN
        IF OLD.status IN ('confirmed', 'completed') THEN
            RAISE EXCEPTION 'لا يمكن تعديل وقت حجز مؤكد أو مكتمل مباشرة.';
        END IF;
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_booking_immutability ON public.bookings;
CREATE TRIGGER trg_protect_booking_immutability
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_immutability_rules();

-- هـ. تريغر المزامنة الحتمية لحالات booking_slots مع الحجز الأم
CREATE OR REPLACE FUNCTION public.sync_booking_slots_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        UPDATE public.booking_slots
        SET status = NEW.status
        WHERE booking_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_slots_lifecycle ON public.bookings;
CREATE TRIGGER trg_sync_slots_lifecycle
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_slots_on_status_change();

-- و. إجراء تحويل المنشأة الموحدة إلى منشأة متعددة الأقسام (convert_venue_to_multi_units)
CREATE OR REPLACE FUNCTION public.convert_venue_to_multi_units(
    p_venue_id UUID,
    p_new_units JSONB -- مصفوفة من [{"name": "...", "unit_type": "...", "capacity_max": 200}]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_has_future_bookings BOOLEAN;
    v_old_default_unit_id UUID;
    v_unit_elem RECORD;
    v_created_unit_id UUID;
    v_booking RECORD;
BEGIN
    -- 1. التحقق من الصلاحيات
    IF NOT (public.has_venue_access(p_venue_id, ARRAY['primary_owner', 'co_owner'])) THEN
        IF NOT (public.is_admin()) THEN
            RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية تعديل هيكل هذه المنشأة.';
        END IF;
    END IF;

    -- 2. التحقق من صحة المدخلات وحالة المنشأة
    IF p_new_units IS NULL OR jsonb_typeof(p_new_units) <> 'array'
       OR jsonb_array_length(p_new_units) < 2 THEN
        RAISE EXCEPTION 'يجب تحديد مصفوفة صحيحة تحتوي على قسمين على الأقل.';
    END IF;

    -- 3. قفل المنشأة FOR UPDATE كأول خطوة لمنع أي سباق أو Deadlock
    PERFORM id FROM public.venues WHERE id = p_venue_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'المنشأة المحددة غير موجودة.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.venues WHERE id = p_venue_id AND has_multiple_units = true) THEN
        RAISE EXCEPTION 'المنشأة متعددة الأقسام بالفعل.';
    END IF;

    SELECT id INTO v_old_default_unit_id
    FROM public.venue_units
    WHERE venue_id = p_venue_id AND unit_type = 'full_venue' AND is_active = true
    ORDER BY created_at
    LIMIT 1;

    IF v_old_default_unit_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على القسم الافتراضي النشط للمنشأة.';
    END IF;

    -- التحقق من الحجوزات المستقبلية على القسم الافتراضي
    IF v_old_default_unit_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.booking_slots
            WHERE venue_id = p_venue_id
              AND unit_id = v_old_default_unit_id
              AND status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
              AND pg_catalog.upper(time_slot) > pg_catalog.now()
        ) INTO v_has_future_bookings;
    ELSE
        v_has_future_bookings := false;
    END IF;

    -- تحديث حالة المنشأة
    UPDATE public.venues
    SET has_multiple_units = true, updated_at = pg_catalog.now()
    WHERE id = p_venue_id;

    -- إنشاء الأقسام الجديدة
    FOR v_unit_elem IN SELECT * FROM jsonb_to_recordset(p_new_units) AS x(name text, unit_type text, capacity_min int, capacity_max int)
    LOOP
        INSERT INTO public.venue_units (
            venue_id, name, unit_type, capacity_min, capacity_max, is_active
        ) VALUES (
            p_venue_id, v_unit_elem.name, v_unit_elem.unit_type, COALESCE(v_unit_elem.capacity_min, 0), v_unit_elem.capacity_max, true
        ) RETURNING id INTO v_created_unit_id;

        -- إذا كانت هناك حجوزات كاملة مستقبلية قائمة على الوحدة القديمة: ربط الأقسام الجديدة بها فوراً
        IF v_has_future_bookings THEN
            FOR v_booking IN 
                SELECT b.id, b.time_slot, b.status 
                FROM public.bookings b
                JOIN public.booking_slots bs ON bs.booking_id = b.id
                WHERE b.venue_id = p_venue_id
                  AND b.is_full_venue = true
                  AND bs.unit_id = v_old_default_unit_id
                  AND b.status IN ('confirmed', 'pending_payment', 'pending_owner_approval', 'owner_review_timed_out')
                  AND pg_catalog.upper(b.time_slot) > pg_catalog.now()
            LOOP
                INSERT INTO public.booking_requested_units (booking_id, venue_id, unit_id)
                VALUES (v_booking.id, p_venue_id, v_created_unit_id);

                INSERT INTO public.booking_slots (booking_id, venue_id, unit_id, time_slot, status)
                VALUES (v_booking.id, p_venue_id, v_created_unit_id, v_booking.time_slot, v_booking.status);
            END LOOP;
        END IF;
    END LOOP;

    -- بعد اكتمال ربط الفتحات بالأقسام الجديدة، يتم تحويل الوحدة الافتراضية القديمة إلى وحدة مؤرشفة وتنظيف الفتحات المستقبلية المكررة
    IF v_old_default_unit_id IS NOT NULL THEN
        IF v_has_future_bookings THEN
            DELETE FROM public.booking_slots 
            WHERE venue_id = p_venue_id 
              AND unit_id = v_old_default_unit_id 
              AND pg_catalog.upper(time_slot) > pg_catalog.now();

            DELETE FROM public.booking_requested_units 
            WHERE venue_id = p_venue_id 
              AND unit_id = v_old_default_unit_id 
              AND booking_id IN (
                  SELECT id FROM public.bookings 
                  WHERE venue_id = p_venue_id AND pg_catalog.upper(time_slot) > pg_catalog.now()
              );
        END IF;

        UPDATE public.venue_units
        SET is_active = false, name = name || ' [أرشيف ما قبل التقسيم]', updated_at = pg_catalog.now()
        WHERE id = v_old_default_unit_id;
    END IF;
END;
$$;

-- ز. الإجراء الذري الموثوق لإنشاء الحجز وتخصيص الفتحات وفحص التعارض (create_booking_with_slots)
CREATE OR REPLACE FUNCTION public.create_booking_with_slots(
    p_venue_id UUID,
    p_booking_source TEXT,
    p_is_full_venue BOOLEAN,
    p_requested_unit_ids UUID[],
    p_event_type TEXT,
    p_guest_count INTEGER,
    p_event_date DATE,
    p_shift TEXT,
    p_time_slot TSTZRANGE,
    p_idempotency_key UUID DEFAULT NULL,
    p_customer_notes TEXT DEFAULT NULL,
    p_guest_details JSONB DEFAULT NULL,
    p_extras JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_booking_id UUID;
    v_ref TEXT;
    v_initial_status public.booking_status;
    v_expires_at TIMESTAMPTZ;
    v_total_amount NUMERIC(14,2) := 0.00;
    v_deposit_amount NUMERIC(14,2) := 0.00;
    v_deposit_pct NUMERIC(5,2);
    v_currency TEXT;
    v_cancellation_id UUID;
    v_cancellation_snapshot JSONB;
    v_total_capacity INTEGER := 0;
    v_requested_count INTEGER;
    v_found_count INTEGER;
    v_base_unit_price NUMERIC(14,2);
    v_unit_cur RECORD;
    v_extra_cur RECORD;
    v_extra_price NUMERIC(14,2);
    v_extra_name TEXT;
    v_extra_curr TEXT;
    v_distinct_extras_count INTEGER;
    v_passed_extras_count INTEGER;
BEGIN
    -- 1. فحص الهوية والتحقق من الصلاحيات
    IF p_booking_source = 'online' THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول لإنشاء حجز إلكتروني.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_id AND is_active = true) THEN
            RAISE EXCEPTION 'حساب العميل غير نشط أو محظور.';
        END IF;

        IF p_idempotency_key IS NULL THEN
            RAISE EXCEPTION 'مفتاح منع التكرار مطلوب للحجز الإلكتروني.';
        END IF;

        SELECT id INTO v_booking_id
        FROM public.bookings
        WHERE customer_id = v_caller_id
          AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN v_booking_id;
        END IF;

        v_initial_status := 'pending_payment'::public.booking_status;
        v_expires_at := pg_catalog.now() + interval '30 minutes';

    ELSIF p_booking_source = 'manual_owner' THEN
        IF NOT public.has_venue_access(p_venue_id, ARRAY['primary_owner', 'co_owner', 'manager', 'receptionist']) THEN
            IF NOT public.is_admin() THEN
                RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية تسجيل حجوزات مكتبية لهذه المنشأة.';
            END IF;
        END IF;

        IF p_guest_details IS NULL OR (p_guest_details->>'guest_name') IS NULL OR (p_guest_details->>'guest_phone') IS NULL THEN
            RAISE EXCEPTION 'بيانات اسم الزبون وهاتفه إلزامية للحجز المكتبي.';
        END IF;

        v_initial_status := 'confirmed'::public.booking_status;
        v_expires_at := NULL;
    ELSE
        RAISE EXCEPTION 'مصدر الحجز غير صالح.';
    END IF;

    -- 2. قفل سجل المنشأة بوضع المشاركة لمنع تعديل الأقسام أثناء الحجز
    SELECT default_currency, default_deposit_percentage, cancellation_policy_id
    INTO v_currency, v_deposit_pct, v_cancellation_id
    FROM public.venues 
    WHERE id = p_venue_id AND status = 'active'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المنشأة غير موجودة أو غير معتمدة حالياً.';
    END IF;

    -- استرجاع لقطة سياسة الإلغاء بدقة
    SELECT jsonb_build_object('name_ar', name_ar, 'rules', rules)
    INTO v_cancellation_snapshot
    FROM public.cancellation_policies 
    WHERE id = v_cancellation_id;

    IF v_cancellation_snapshot IS NULL THEN
        v_cancellation_snapshot := '{"name_ar": "افتراضية", "rules": []}'::jsonb;
    END IF;

    -- 3. التحقق الرياضي من النطاق الزمني ومطابقة تاريخ اليوم لتوقيت اليمن
    IF pg_catalog.isempty(p_time_slot) OR pg_catalog.lower(p_time_slot) >= pg_catalog.upper(p_time_slot) THEN
        RAISE EXCEPTION 'النطاق الزمني غير صالح.';
    END IF;

    IF public.timestamptz_to_yemen_date(pg_catalog.lower(p_time_slot)) <> p_event_date THEN
        RAISE EXCEPTION 'تاريخ بداية النطاق الزمني لا يطابق تاريخ المناسبة المحدد.';
    END IF;

    -- 4. فحص الإتاحة والاستثناءات
    IF EXISTS (
        SELECT 1 FROM public.venue_availability
        WHERE venue_id = p_venue_id
          AND override_date = p_event_date
          AND shift = p_shift
          AND is_blocked = true
          AND (unit_id IS NULL OR (p_requested_unit_ids IS NOT NULL AND unit_id = ANY(p_requested_unit_ids)) OR p_is_full_venue = true)
    ) THEN
        RAISE EXCEPTION 'الموعد المطلوب مغلق للصيانة أو بطلب إدارة المنشأة.';
    END IF;

    -- 5. توليد المرجع الفريد
    v_ref := 'MRB-' || to_char(p_event_date, 'YYMM') || '-' || lpad(nextval('public.booking_ref_seq')::text, 5, '0');

    -- 6. إنشاء سجل الحجز الأولي (قبل إضافة بنود السعر)
    INSERT INTO public.bookings (
        booking_reference, idempotency_key, venue_id, customer_id, booking_source,
        is_full_venue, event_type, guest_count, event_date, shift,
        time_slot, status, total_amount, deposit_amount, currency,
        cancellation_policy_snapshot, customer_notes, expires_at
    ) VALUES (
        v_ref, p_idempotency_key, p_venue_id, CASE WHEN p_booking_source = 'online' THEN v_caller_id ELSE NULL END,
        p_booking_source, p_is_full_venue, p_event_type, p_guest_count,
        p_event_date, p_shift, p_time_slot, v_initial_status,
        0.00, 0.00, v_currency,
        v_cancellation_snapshot, p_customer_notes, v_expires_at
    ) RETURNING id INTO v_booking_id;

    -- 7. معالجة الأقسام وحساب أسعارها وحفظ بنود السعر الفردية
    IF p_is_full_venue = true THEN
        -- استرجاع كافة الأقسام النشطة
        SELECT COALESCE(SUM(capacity_max), 0), count(*)
        INTO v_total_capacity, v_found_count
        FROM public.venue_units
        WHERE venue_id = p_venue_id AND is_active = true;

        IF v_found_count = 0 THEN
            RAISE EXCEPTION 'لا توجد وحدات نشطة محددة لهذه المنشأة.';
        END IF;

        -- البحث عن السعر الشامل للمنشأة كاملة بحسب سلم الأولويات الحتمي القطعي
        SELECT COALESCE(
            -- 1. استثناء تاريخ لكامل المنشأة
            (SELECT custom_price FROM public.venue_availability 
             WHERE venue_id = p_venue_id AND unit_id IS NULL AND override_date = p_event_date AND shift = p_shift AND custom_price IS NOT NULL LIMIT 1),
            -- 2. سعر موسمي لكامل المنشأة
            (SELECT price FROM public.pricing_tiers 
             WHERE venue_id = p_venue_id AND unit_id IS NULL AND shift = p_shift AND is_seasonal = true AND p_event_date BETWEEN season_start AND season_end LIMIT 1),
            -- 3. سعر يوم أسبوع لكامل المنشأة
            (SELECT price FROM public.pricing_tiers 
             WHERE venue_id = p_venue_id AND unit_id IS NULL AND shift = p_shift AND is_seasonal = false AND day_of_week = EXTRACT(DOW FROM p_event_date) LIMIT 1),
            -- 4. سعر افتراضي عام لكامل المنشأة
            (SELECT price FROM public.pricing_tiers 
             WHERE venue_id = p_venue_id AND unit_id IS NULL AND shift = p_shift AND is_seasonal = false AND day_of_week IS NULL LIMIT 1)
        ) INTO v_base_unit_price;

        IF v_base_unit_price IS NULL THEN
            RAISE EXCEPTION 'لا توجد خطة تسعير معتمدة للمنشأة بالكامل في هذا التوقيت.';
        END IF;

        v_total_amount := v_total_amount + v_base_unit_price;

        -- إدراج بند السعر
        INSERT INTO public.booking_price_items (booking_id, item_type, description_ar, unit_price, quantity, total_price, currency)
        VALUES (v_booking_id, 'full_venue_rate', 'إيجار المنشأة بالكامل للفترة', v_base_unit_price, 1, v_base_unit_price, v_currency);

        -- إدراج الأقسام في الطلبات والفتحات
        INSERT INTO public.booking_requested_units (booking_id, venue_id, unit_id)
        SELECT v_booking_id, p_venue_id, vu.id
        FROM public.venue_units vu
        WHERE vu.venue_id = p_venue_id AND vu.is_active = true;

        INSERT INTO public.booking_slots (booking_id, venue_id, unit_id, time_slot, status)
        SELECT v_booking_id, p_venue_id, vu.id, p_time_slot, v_initial_status
        FROM public.venue_units vu
        WHERE vu.venue_id = p_venue_id AND vu.is_active = true;

    ELSE
        -- حجز جزئي
        IF p_requested_unit_ids IS NULL OR cardinality(p_requested_unit_ids) = 0 THEN
            RAISE EXCEPTION 'يجب تحديد قسم واحد على الأقل للحجز الجزئي.';
        END IF;

        -- فحص تكرار معرفات الأقسام
        SELECT cardinality(p_requested_unit_ids), count(DISTINCT u)
        INTO v_requested_count, v_found_count
        FROM unnest(p_requested_unit_ids) AS u;

        IF v_requested_count <> v_found_count THEN
            RAISE EXCEPTION 'مصفوفة الأقسام المطلوبة تحتوي على تكرار.';
        END IF;

        -- التحقق من عدد الأقسام ومطابقتها للمنشأة
        SELECT count(*), COALESCE(SUM(capacity_max), 0)
        INTO v_found_count, v_total_capacity
        FROM public.venue_units
        WHERE venue_id = p_venue_id AND id = ANY(p_requested_unit_ids) AND is_active = true;

        IF v_found_count <> v_requested_count THEN
            RAISE EXCEPTION 'أحد الأقسام المطلوبة غير موجود أو غير نشط أو لا ينتمي للمنشأة.';
        END IF;

        -- حساب السعر لكل قسم وإدراجه كبند مستقل
        FOR v_unit_cur IN 
            SELECT id, name FROM public.venue_units WHERE venue_id = p_venue_id AND id = ANY(p_requested_unit_ids)
        LOOP
            SELECT COALESCE(
                -- 1. استثناء تاريخ للقسم
                (SELECT custom_price FROM public.venue_availability 
                 WHERE venue_id = p_venue_id AND unit_id = v_unit_cur.id AND override_date = p_event_date AND shift = p_shift AND custom_price IS NOT NULL LIMIT 1),
                -- 2. سعر موسمي للقسم
                (SELECT price FROM public.pricing_tiers 
                 WHERE venue_id = p_venue_id AND unit_id = v_unit_cur.id AND shift = p_shift AND is_seasonal = true AND p_event_date BETWEEN season_start AND season_end LIMIT 1),
                -- 3. سعر يوم أسبوع للقسم
                (SELECT price FROM public.pricing_tiers 
                 WHERE venue_id = p_venue_id AND unit_id = v_unit_cur.id AND shift = p_shift AND is_seasonal = false AND day_of_week = EXTRACT(DOW FROM p_event_date) LIMIT 1),
                -- 4. سعر عام للقسم
                (SELECT price FROM public.pricing_tiers 
                 WHERE venue_id = p_venue_id AND unit_id = v_unit_cur.id AND shift = p_shift AND is_seasonal = false AND day_of_week IS NULL LIMIT 1)
            ) INTO v_base_unit_price;

            IF v_base_unit_price IS NULL THEN
                RAISE EXCEPTION 'لا توجد خطة تسعير للقسم: % في هذا التوقيت.', v_unit_cur.name;
            END IF;

            v_total_amount := v_total_amount + v_base_unit_price;

            INSERT INTO public.booking_price_items (booking_id, item_type, description_ar, unit_price, quantity, total_price, currency)
            VALUES (v_booking_id, 'unit_rate', 'إيجار: ' || v_unit_cur.name, v_base_unit_price, 1, v_base_unit_price, v_currency);

            INSERT INTO public.booking_requested_units (booking_id, venue_id, unit_id)
            VALUES (v_booking_id, p_venue_id, v_unit_cur.id);

            -- إدراج الفتحة (تخضع لحماية قيد prevent_unit_slot_overlap الاستبعادي)
            INSERT INTO public.booking_slots (booking_id, venue_id, unit_id, time_slot, status)
            VALUES (v_booking_id, p_venue_id, v_unit_cur.id, p_time_slot, v_initial_status);
        END LOOP;
    END IF;

    -- التحقق من السعة القصوى
    IF p_guest_count > v_total_capacity THEN
        RAISE EXCEPTION 'عدد الضيوف (%) يتجاوز الطاقة الاستيعابية للأقسام المحددة (%).', p_guest_count, v_total_capacity;
    END IF;

    -- 8. معالجة وحساب الخدمات الإضافية
    IF p_extras IS NOT NULL AND pg_catalog.jsonb_typeof(p_extras) <> 'array' THEN
        RAISE EXCEPTION 'بيانات الخدمات الإضافية يجب أن تكون مصفوفة JSON.';
    END IF;

    IF p_extras IS NOT NULL AND pg_catalog.jsonb_array_length(p_extras) > 0 THEN
        -- التحقق من عدم وجود تكرار لمعرف الخدمة
        SELECT count(*), count(DISTINCT (e.value->>'amenity_id'))
        INTO v_passed_extras_count, v_distinct_extras_count
        FROM pg_catalog.jsonb_array_elements(p_extras) AS e(value);

        IF v_passed_extras_count <> v_distinct_extras_count THEN
            RAISE EXCEPTION 'مصفوفة الخدمات الإضافية تحتوي على خدمات مكررة.';
        END IF;

        FOR v_extra_cur IN SELECT (e.value->>'amenity_id')::uuid AS amenity_id, COALESCE((e.value->>'quantity')::int, 1) AS quantity FROM pg_catalog.jsonb_array_elements(p_extras) AS e(value)
        LOOP
            IF v_extra_cur.quantity <= 0 THEN
                RAISE EXCEPTION 'كمية الخدمة الإضافية يجب أن تكون أكبر من صفر.';
            END IF;

            SELECT va.additional_price, a.name_ar, va.currency 
            INTO v_extra_price, v_extra_name, v_extra_curr
            FROM public.venue_amenities va
            JOIN public.amenities a ON a.id = va.amenity_id
            WHERE va.venue_id = p_venue_id AND va.amenity_id = v_extra_cur.amenity_id AND va.is_free = false;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'إحدى الخدمات الإضافية المطلوبة غير متوفرة أو غير مدفوعة في هذه المنشأة.';
            END IF;

            IF v_extra_curr <> v_currency THEN
                RAISE EXCEPTION 'عملة الخدمة الإضافية (%) لا تطابق عملة المنشأة (%).', v_extra_curr, v_currency;
            END IF;

            v_total_amount := v_total_amount + (v_extra_price * v_extra_cur.quantity);

            INSERT INTO public.booking_extras (booking_id, amenity_id, name_ar, unit_price, quantity, total_price, currency)
            VALUES (v_booking_id, v_extra_cur.amenity_id, v_extra_name, v_extra_price, v_extra_cur.quantity, (v_extra_price * v_extra_cur.quantity), v_currency);

            INSERT INTO public.booking_price_items (booking_id, item_type, description_ar, unit_price, quantity, total_price, currency)
            VALUES (v_booking_id, 'extra_service', 'خدمة إضافية: ' || v_extra_name, v_extra_price, v_extra_cur.quantity, (v_extra_price * v_extra_cur.quantity), v_currency);
        END LOOP;
    END IF;

    -- حساب العربون
    v_deposit_amount := round((v_total_amount * (v_deposit_pct / 100.0)), 2);

    -- 9. تحديث إجمالي الحجز والعربون بعد اكتمال الحساب الخادمي الدقيق
    UPDATE public.bookings
    SET total_amount = v_total_amount,
        deposit_amount = v_deposit_amount
    WHERE id = v_booking_id;

    -- 10. إدراج بيانات الضيف للحجز المكتبي
    IF p_booking_source = 'manual_owner' THEN
        INSERT INTO public.booking_guest_details (booking_id, guest_name, guest_phone, notes)
        VALUES (
            v_booking_id,
            p_guest_details->>'guest_name',
            p_guest_details->>'guest_phone',
            p_guest_details->>'notes'
        );
    END IF;

    -- 11. تسجيل حركة التدقيق
    INSERT INTO public.booking_audit_logs (booking_id, actor_id, to_status, action_description, payload)
    VALUES (
        v_booking_id, v_caller_id, v_initial_status,
        'إنشاء الحجز وتخصيص الفتحات وحساب السعر الموثوق',
        jsonb_build_object('total', v_total_amount, 'deposit', v_deposit_amount, 'currency', v_currency)
    );

    RETURN v_booking_id;
END;
$$;

-- ==============================================================================
-- 23. فهارس الأداء وتدعيم الاستعلامات السريعة للمجموعة الأولى
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(status);
CREATE INDEX IF NOT EXISTS idx_venue_units_venue_active ON public.venue_units(venue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar ON public.bookings(venue_id, event_date, shift);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_history ON public.bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_expiry ON public.bookings(status, expires_at) WHERE status = 'pending_payment';
CREATE INDEX IF NOT EXISTS idx_booking_slots_search ON public.booking_slots(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_slots_booking ON public.booking_slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_req_units_booking ON public.booking_requested_units(booking_id);

-- ==============================================================================
-- 24. تفعيل سياسات الأمان على مستوى الصف (RLS) وحماية الجداول من التعديل المباشر
-- ==============================================================================

-- أ. تفعيل RLS على كافة جداول المجموعة الأولى
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requested_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_guest_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;

-- ب. سياسات القراءة العامة للبيانات التعريفية والمنشآت النشطة (Public Read)
DO $$ BEGIN
    CREATE POLICY "allow_public_read_active_categories" ON public.venue_categories
    FOR SELECT TO public USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_cancellation_policies" ON public.cancellation_policies
    FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_active_venues" ON public.venues
    FOR SELECT TO public USING (
        status = 'active' 
        OR (auth.uid() IS NOT NULL AND (public.has_venue_access(id) OR public.is_admin()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_venue_units" ON public.venue_units
    FOR SELECT TO public USING (
        (is_active = true AND EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.status = 'active'))
        OR (auth.uid() IS NOT NULL AND (public.has_venue_access(venue_id) OR public.is_admin()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_amenities" ON public.amenities
    FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_venue_amenities" ON public.venue_amenities
    FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_pricing_tiers" ON public.pricing_tiers
    FOR SELECT TO public USING (
        EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.status = 'active')
        OR (auth.uid() IS NOT NULL AND (public.has_venue_access(venue_id) OR public.is_admin()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_public_read_venue_availability" ON public.venue_availability
    FOR SELECT TO public USING (
        EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.status = 'active')
        OR (auth.uid() IS NOT NULL AND (public.has_venue_access(venue_id) OR public.is_admin()))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ج. سياسات قراءة الفتحات الزمنية لعرض التقويم وحماية تفاصيل الحجوزات
DO $$ BEGIN
    CREATE POLICY "allow_read_booking_slots_authorized" ON public.booking_slots
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id
              AND (
                  b.customer_id = auth.uid()
                  OR public.has_venue_access(b.venue_id)
                  OR public.is_admin()
              )
        )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_profiles" ON public.profiles
    FOR SELECT TO authenticated USING (
        id = auth.uid() OR public.is_admin()
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_update_own_profile" ON public.profiles
    FOR UPDATE TO authenticated USING (
        id = auth.uid()
    ) WITH CHECK (
        id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- د. سياسات حماية الحجوزات (قراءة الحجز لصاحبه أو طاقم المنشأة فقط، ومنع التعديل المباشر)
DO $$ BEGIN
    CREATE POLICY "allow_read_own_bookings" ON public.bookings
    FOR SELECT TO authenticated USING (
        customer_id = auth.uid() 
        OR public.has_venue_access(venue_id) 
        OR public.is_admin()
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_booking_requested_units" ON public.booking_requested_units
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
              AND (b.customer_id = auth.uid() OR public.has_venue_access(b.venue_id) OR public.is_admin())
        )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_booking_price_items" ON public.booking_price_items
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
              AND (b.customer_id = auth.uid() OR public.has_venue_access(b.venue_id) OR public.is_admin())
        )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_booking_extras" ON public.booking_extras
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
              AND (b.customer_id = auth.uid() OR public.has_venue_access(b.venue_id) OR public.is_admin())
        )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_booking_guest_details" ON public.booking_guest_details
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
              AND (public.has_venue_access(b.venue_id) OR public.is_admin())
        )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_booking_audit_logs" ON public.booking_audit_logs
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
              AND (public.has_venue_access(b.venue_id, ARRAY['primary_owner', 'co_owner']) OR public.is_admin())
        )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;




-- ==============================================================================
-- 25. صلاحيات تنفيذ الدوال (منع EXECUTE العام غير المقصود)
-- ==============================================================================
REVOKE ALL ON FUNCTION public.handle_new_venue_default_unit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_venue_activation_units() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_booking_yemen_date() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_booking_immutability_rules() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_booking_slots_on_status_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.has_venue_access(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_venue_access(UUID, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.manage_venue_unit(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.convert_venue_to_multi_units(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_booking_with_slots(UUID, TEXT, BOOLEAN, UUID[], TEXT, INTEGER, DATE, TEXT, TSTZRANGE, UUID, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_venue_unit(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_venue_to_multi_units(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(UUID, TEXT, BOOLEAN, UUID[], TEXT, INTEGER, DATE, TEXT, TSTZRANGE, UUID, TEXT, JSONB, JSONB) TO authenticated;

'use client';

import { useState } from 'react';
import { useT } from '@/i18n/useT';
import type { CompareInput } from '@/stores/compareStore';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

interface CompareFormProps {
  title: string;
  confirmLabel: string;
  initial: CompareInput;
  onConfirm: (input: CompareInput) => void;
  onCancel: () => void;
}

/** backend ระบุรถด้วย bn (ตัวเลข) — ฝั่งและ pgnum ได้จากผลตรวจเอง */
export function CompareForm({ title, confirmLabel, initial, onConfirm, onCancel }: CompareFormProps) {
  const { t } = useT();
  const [bn, setBn] = useState(initial.bn ? String(initial.bn) : '');
  const valid = /^\d+$/.test(bn);

  const submit = () => {
    if (valid) onConfirm({ bn: Number(bn) });
  };

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="-mb-0.5 basis-full text-[12px] font-semibold text-text-2">{title}</div>
      <Field label={t('compare.bnLabel')} htmlFor="cmp-bn">
        <input
          id="cmp-bn"
          className="ctl"
          inputMode="numeric"
          value={bn}
          onChange={(e) => setBn(e.target.value.trim())}
          placeholder={t('compare.bnPlaceholder')}
          autoComplete="off"
          autoFocus
        />
      </Field>
      <Button type="submit" disabled={!valid}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
    </form>
  );
}

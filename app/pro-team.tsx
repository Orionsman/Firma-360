import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, ShieldCheck, Trash2, Users } from 'lucide-react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

type MemberRow = {
  user_id: string;
  role: 'owner' | 'admin' | 'user';
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
};

export default function ProTeamScreen() {
  const { company, activeRole, removeCompanyMember, revokeInvitation } = useAuth();
  const { theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<(MemberRow & { profile?: ProfileRow | null })[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);

  const canManage = activeRole === 'owner' || activeRole === 'admin';
  const localeTag = t.locale() === 'tr' ? 'tr-TR' : 'en-US';

  const loadData = useCallback(async () => {
    if (!company) {
      setMembers([]);
      setInvitations([]);
      return;
    }

    const [membersResult, invitationsResult] = await Promise.all([
      supabase
        .from('user_companies')
        .select('user_id, role, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('team_invitations')
        .select('id, email, role, status, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
    ]);

    if (membersResult.error || invitationsResult.error) {
      throw new Error(
        membersResult.error?.message ||
          invitationsResult.error?.message ||
          t.businessTools.errors.loadFailed
      );
    }

    const memberRows = (membersResult.data as MemberRow[]) ?? [];
    const profileIds = memberRows.map((row) => row.user_id);
    const profilesResult =
      profileIds.length > 0
        ? await supabase.from('profiles').select('user_id, email, full_name').in('user_id', profileIds)
        : { data: [], error: null };

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    const profiles = new Map(
      ((profilesResult.data as ProfileRow[]) ?? []).map((profile) => [profile.user_id, profile])
    );

    setMembers(
      memberRows.map((row) => ({
        ...row,
        profile: profiles.get(row.user_id) ?? null,
      }))
    );
    setInvitations((invitationsResult.data as InvitationRow[]) ?? []);
  }, [company]);

  useEffect(() => {
    void loadData().catch((error: unknown) => {
      Alert.alert(t.common.error, error instanceof Error ? error.message : t.businessTools.errors.loadFailed);
    });
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const roleLabels: Record<'owner' | 'admin' | 'user', string> = {
    owner: localeTag === 'tr-TR' ? 'Sahip' : 'Owner',
    admin: t.businessTools.team.admin,
    user: t.businessTools.team.user,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <BrandHeroHeader
        kicker={t.businessTools.kicker}
        title={t.businessTools.team.title}
        subtitle={t.businessTools.team.helper}
        rightAccessory={
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {localeTag === 'tr-TR' ? 'Aktif Personel ve Ekip' : 'Active Staff and Team'}
        </Text>
        <View style={styles.list}>
          {members.map((member) => (
            <View
              key={member.user_id}
              style={[styles.row, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
            >
              <View style={styles.rowMain}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                  <Users size={16} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                    {member.profile?.full_name || member.profile?.email || member.user_id.slice(0, 8)}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                    {roleLabels[member.role]} - {new Date(member.created_at).toLocaleDateString(localeTag)}
                  </Text>
                </View>
              </View>
              {canManage && member.role !== 'owner' ? (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.dangerSoft }]}
                  onPress={() =>
                    void removeCompanyMember(company!.id, member.user_id).then(loadData).catch((error: unknown) => {
                      Alert.alert(
                        t.common.error,
                        error instanceof Error
                          ? error.message
                          : localeTag === 'tr-TR'
                            ? 'Kullanıcı kaldırılamadı.'
                            : 'Member could not be removed.'
                      );
                    })
                  }
                >
                  <Trash2 size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              ) : (
                <ShieldCheck size={18} color={theme.colors.primary} />
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {localeTag === 'tr-TR' ? 'Bekleyen Davetler' : 'Pending Invitations'}
        </Text>
        <View style={styles.list}>
          {invitations.map((invite) => (
            <View
              key={invite.id}
              style={[styles.row, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
            >
              <View style={styles.rowMain}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                  <Mail size={16} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{invite.email}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>
                    {roleLabels[invite.role]} - {invite.status}
                  </Text>
                </View>
              </View>
              {canManage && invite.status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.dangerSoft }]}
                  onPress={() =>
                    void revokeInvitation(invite.id).then(loadData).catch((error: unknown) => {
                      Alert.alert(
                        t.common.error,
                        error instanceof Error
                          ? error.message
                          : localeTag === 'tr-TR'
                            ? 'Davet geri alınamadı.'
                            : 'Invitation could not be revoked.'
                      );
                    })
                  }
                >
                  <Trash2 size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: 14,
  },
  list: {
    gap: 10,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1 },
  rowTitle: { ...typography.heading, fontSize: 14 },
  rowMeta: { ...typography.body, fontSize: 12, marginTop: 4, lineHeight: 18 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

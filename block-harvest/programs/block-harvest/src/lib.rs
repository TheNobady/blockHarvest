use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("C54J4haBjNNGYfV8ZENqvDRzvhX5ReeJPjyCVnySbdXj");

// Paste your `solana address` output here between the quotes
const ADMIN: &str = "b2ZT8E77rduCDYuM9M1gXPY7MMPpHvvEEhh6WV2me4E";

#[program]
pub mod block_harvest {
    use super::*;

    pub fn register_farmer(ctx: Context<RegisterFarmer>) -> Result<()> {
        let account = &mut ctx.accounts.farmer_account;
        account.farmer            = ctx.accounts.farmer.key();
        account.premium_paid      = false;
        account.premium_amount    = 0;
        account.payment_timestamp = 0;
        account.claim_filed       = false;
        account.claim_approved    = false;
        account.bump = ctx.bumps.farmer_account;
        msg!("Farmer registered: {}", ctx.accounts.farmer.key());
        Ok(())
    }

    pub fn pay_premium(ctx: Context<PayPremium>) -> Result<()> {
        let premium_lamports: u64 = 100_000_000; // 0.1 SOL

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.farmer.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, premium_lamports)?;

        let account = &mut ctx.accounts.farmer_account;
        account.premium_paid      = true;
        account.premium_amount    = premium_lamports;
        account.payment_timestamp = Clock::get()?.unix_timestamp;

        msg!("Premium paid: {} lamports", premium_lamports);
        Ok(())
    }

    pub fn file_claim(ctx: Context<FileClaim>) -> Result<()> {
        let account = &mut ctx.accounts.farmer_account;
        account.claim_filed    = true;
        account.claim_approved = false;
        msg!("Claim filed for: {}", account.farmer);
        Ok(())
    }

    pub fn approve_claim(ctx: Context<ApproveClaim>) -> Result<()> {
        let payout     = ctx.accounts.farmer_account.premium_amount;
        let vault_bump = ctx.bumps.vault;

        let vault_seeds: &[&[&[u8]]] = &[&[b"vault", &[vault_bump]]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to:   ctx.accounts.farmer_wallet.to_account_info(),
            },
            vault_seeds,
        );
        system_program::transfer(cpi_context, payout)?;

        ctx.accounts.farmer_account.claim_approved = true;
        msg!("Claim approved. {} lamports released", payout);
        Ok(())
    }
}

// ── Data stored on-chain per farmer ──────────────────────────────────
#[account]
pub struct FarmerAccount {
    pub farmer:            Pubkey, // 32
    pub premium_paid:      bool,   //  1
    pub premium_amount:    u64,    //  8
    pub payment_timestamp: i64,    //  8
    pub claim_filed:       bool,   //  1
    pub claim_approved:    bool,   //  1
    pub bump:              u8,     //  1
}                                  // = 52 bytes total

// ── register_farmer ───────────────────────────────────────────────────
#[derive(Accounts)]
pub struct RegisterFarmer<'info> {
    #[account(
        init,
        payer  = farmer,
        space  = 8 + 52,
        seeds  = [b"farmer", farmer.key().as_ref()],
        bump
    )]
    pub farmer_account: Account<'info, FarmerAccount>,

    #[account(mut)]
    pub farmer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ── pay_premium ───────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct PayPremium<'info> {
    #[account(
        mut,
        seeds  = [b"farmer", farmer.key().as_ref()],
        bump   = farmer_account.bump,
        constraint = !farmer_account.premium_paid @ ErrorCode::AlreadyPaid,
    )]
    pub farmer_account: Account<'info, FarmerAccount>,

    #[account(mut)]
    pub farmer: Signer<'info>,

    /// CHECK: program vault PDA
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ── file_claim ────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct FileClaim<'info> {
    #[account(
        mut,
        seeds  = [b"farmer", farmer_wallet.key().as_ref()],
        bump   = farmer_account.bump,
        constraint = farmer_account.premium_paid  @ ErrorCode::PremiumNotPaid,
        constraint = !farmer_account.claim_filed  @ ErrorCode::ClaimAlreadyFiled,
    )]
    pub farmer_account: Account<'info, FarmerAccount>,

    /// CHECK: farmer whose claim is being filed
    pub farmer_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = admin.key().to_string() == ADMIN @ ErrorCode::Unauthorized,
    )]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ── approve_claim ─────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct ApproveClaim<'info> {
    #[account(
        mut,
        seeds  = [b"farmer", farmer_wallet.key().as_ref()],
        bump   = farmer_account.bump,
        constraint = farmer_account.claim_filed      @ ErrorCode::NoClaimFiled,
        constraint = !farmer_account.claim_approved  @ ErrorCode::ClaimAlreadyApproved,
    )]
    pub farmer_account: Account<'info, FarmerAccount>,

    /// CHECK: receives the payout
    #[account(
        mut,
        constraint = farmer_wallet.key() == farmer_account.farmer @ ErrorCode::WrongFarmer,
    )]
    pub farmer_wallet: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        constraint = admin.key().to_string() == ADMIN @ ErrorCode::Unauthorized,
    )]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ── errors ────────────────────────────────────────────────────────────
#[error_code]
pub enum ErrorCode {
    #[msg("Premium already paid")]
    AlreadyPaid,
    #[msg("Premium not paid yet")]
    PremiumNotPaid,
    #[msg("Claim already filed")]
    ClaimAlreadyFiled,
    #[msg("No claim filed")]
    NoClaimFiled,
    #[msg("Claim already approved")]
    ClaimAlreadyApproved,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Wrong farmer wallet")]
    WrongFarmer,
}

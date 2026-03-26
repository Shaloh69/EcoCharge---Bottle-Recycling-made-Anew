from ..extensions import db
from ..models.user import User
from ..models.credit_transaction import CreditTransaction


def award_credits(user: User, amount: int, ref_type: str, ref_id: int) -> CreditTransaction:
    """Add credits to user balance and record the transaction."""
    user.credit_balance += amount
    txn = CreditTransaction(
        user_id=user.id,
        type="EARN",
        amount=amount,
        balance_after=user.credit_balance,
        ref_type=ref_type,
        ref_id=ref_id,
    )
    db.session.add(txn)
    return txn


def spend_credits(user: User, amount: int, ref_type: str, ref_id: int) -> CreditTransaction:
    """Deduct credits from user balance and record the transaction.

    Raises ValueError if balance is insufficient.
    """
    if user.credit_balance < amount:
        raise ValueError(
            f"Insufficient credits: balance={user.credit_balance}, required={amount}"
        )
    user.credit_balance -= amount
    txn = CreditTransaction(
        user_id=user.id,
        type="SPEND",
        amount=amount,
        balance_after=user.credit_balance,
        ref_type=ref_type,
        ref_id=ref_id,
    )
    db.session.add(txn)
    return txn

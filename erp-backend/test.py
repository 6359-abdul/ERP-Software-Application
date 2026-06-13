from app import create_app
app = create_app()
app.app_context().push()
from routes.petty_cash_report_routes import branch_expense_details
import flask

class MockUser:
    role = 'Admin'

with app.test_request_context('/?branch_id=3', headers={'X-Academic-Year': '2026-2027'}):
    response = branch_expense_details.__wrapped__(MockUser())
    print(response[0].get_data(as_text=True))

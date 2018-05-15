/*
 * Container component
 * All data handling & manipulation should be handled here.
 */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

import CREDIT_TRANSACTIONS from '../constants/routes/CreditTransactions';
import history from '../app/History';
import { getFuelSuppliers } from '../actions/organizationActions';
import { getLoggedInUser } from '../actions/userActions';
import { addCreditTransfer, invalidateCreditTransfers } from '../actions/creditTransfersActions';

import CreditTransferForm from './components/CreditTransferForm';
import { CREDIT_TRANSFER_STATUS } from '../constants/values';
import ModalSubmitCreditTransfer from './components/ModalSubmitCreditTransfer';
import * as Lang from '../constants/langEnUs';

const buttonActions = [Lang.BTN_SAVE_DRAFT, Lang.BTN_SIGN_1_2];

class CreditTransferAddContainer extends Component {
  constructor (props) {
    super(props);

    this.state = {
      creditsFrom: {},
      creditsTo: {},
      fields: {
        fairMarketValuePerCredit: '',
        initiator: {},
        note: '',
        numberOfCredits: '',
        respondent: { id: 0, name: '' },
        terms: [],
        tradeType: { id: 1, name: 'Sell' }
      },
      totalValue: 0
    };

    this._addToFields = this._addToFields.bind(this);
    this._changeStatus = this._changeStatus.bind(this);
    this._handleInputChange = this._handleInputChange.bind(this);
    this._handleSubmit = this._handleSubmit.bind(this);
    this._toggleCheck = this._toggleCheck.bind(this);
  }

  componentDidMount () {
    this.props.getFuelSuppliers();
  }

  componentWillReceiveProps (props) {
    // Set the initiator as the logged in user's organization
    const fieldState = { ...this.state.fields };
    fieldState.initiator = this.props.loggedInUser.organization;
    this.setState({
      fields: fieldState,
      creditsFrom: fieldState.initiator
    });
  }

  _addToFields (value) {
    const fieldState = { ...this.state.fields };
    fieldState.terms.push(value);

    this.setState({
      fields: fieldState
    });
  }

  _changeStatus (status) {
    this.changeObjectProp(status.id, 'tradeStatus');
  }

  _handleInputChange (event) {
    const { value, name } = event.target;
    const fieldState = { ...this.state.fields };

    if (typeof fieldState[name] === 'object') {
      this.changeObjectProp(parseInt(value, 10), name);
    } else {
      fieldState[name] = value;
      this.setState({
        fields: fieldState
      }, () => this.computeTotalValue(name));
    }
  }

  _toggleCheck (key) {
    const fieldState = { ...this.state.fields };
    const index = fieldState.terms.findIndex(term => term.id === key);
    fieldState.terms[index].value = !fieldState.terms[index].value;

    this.setState({
      fields: fieldState
    });
  }

  changeObjectProp (id, name) {
    const fieldState = { ...this.state.fields };
    if (name === 'respondent') {
      // Populate the dropdown
      const respondents = this.props.fuelSuppliers.filter(fuelSupplier => (fuelSupplier.id === id));

      fieldState.respondent = respondents.length === 1 ? respondents[0] : { id: 0 };
      this.setState({
        fields: fieldState
      }, () => this.changeFromTo(
        this.state.fields.tradeType,
        this.state.fields.initiator,
        this.state.fields.respondent
      ));
    } else if (name === 'tradeType') {
      fieldState[name] = { id: id || 0 };
      this.setState({
        fields: fieldState
      }, () => this.changeFromTo(
        this.state.fields.tradeType,
        this.state.fields.initiator,
        this.state.fields.respondent
      ));
    } else {
      fieldState[name] = { id: id || 0 };
      this.setState({
        fields: fieldState
      });
    }
  }

  _handleSubmit (event, status) {
    event.preventDefault();

    // API data structure
    const data = {
      initiator: this.state.fields.initiator.id,
      numberOfCredits: parseInt(this.state.fields.numberOfCredits, 10),
      respondent: this.state.fields.respondent.id,
      fairMarketValuePerCredit: parseFloat(this.state.fields.fairMarketValuePerCredit).toFixed(2),
      note: this.state.fields.note,
      status: status.id,
      type: this.state.fields.tradeType.id,
      tradeEffectiveDate: null
    };

    this.props.addCreditTransfer(data).then(() => {
      this.props.invalidateCreditTransfers();
      history.push(CREDIT_TRANSACTIONS.LIST);
    });

    return false;
  }

  changeFromTo (tradeType, initiator, respondent) {
    // Change the creditsFrom and creditsTo according to the trade type
    let creditsFrom = initiator;
    let creditsTo = respondent;
    if (tradeType.id === 2) {
      creditsFrom = respondent;
      creditsTo = initiator;
    }

    this.setState({ creditsFrom, creditsTo });
  }

  computeTotalValue (name) {
    // Compute the total value when the fields change
    if (['numberOfCredits', 'fairMarketValuePerCredit'].includes(name)) {
      this.setState({
        totalValue:
          this.state.fields.numberOfCredits * this.state.fields.fairMarketValuePerCredit
      });
    }
  }

  render () {
    return ([
      <CreditTransferForm
        addToFields={this._addToFields}
        buttonActions={buttonActions}
        changeStatus={this._changeStatus}
        creditsFrom={this.state.creditsFrom}
        creditsTo={this.state.creditsTo}
        errors={this.props.errors}
        fields={this.state.fields}
        fuelSuppliers={this.props.fuelSuppliers}
        handleInputChange={this._handleInputChange}
        handleSubmit={this._handleSubmit}
        key="creditTransferForm"
        terms={this.state.terms}
        title="New Credit Transfer"
        toggleCheck={this._toggleCheck}
        totalValue={this.state.totalValue}
      />,
      <ModalSubmitCreditTransfer
        key="confirmSubmit"
        submitCreditTransfer={(event) => {
          this._handleSubmit(event, CREDIT_TRANSFER_STATUS.proposed);
        }}
        message="Do you want to sign and send this document to the other party
        named in this transfer?"
      />
    ]);
  }
}

CreditTransferAddContainer.defaultProps = {
  errors: {}
};

CreditTransferAddContainer.propTypes = {
  addCreditTransfer: PropTypes.func.isRequired,
  getFuelSuppliers: PropTypes.func.isRequired,
  invalidateCreditTransfers: PropTypes.func.isRequired,
  loggedInUser: PropTypes.shape({
    displayName: PropTypes.string,
    organization: PropTypes.shape({
      name: PropTypes.string,
      id: PropTypes.number
    })
  }).isRequired,
  fuelSuppliers: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  errors: PropTypes.shape({})
};

const mapStateToProps = state => ({
  loggedInUser: state.rootReducer.userRequest.loggedInUser,
  fuelSuppliers: state.rootReducer.fuelSuppliersRequest.fuelSuppliers,
  errors: state.rootReducer.creditTransfer.errors
});

const mapDispatchToProps = dispatch => ({
  getFuelSuppliers: bindActionCreators(getFuelSuppliers, dispatch),
  getLoggedInUser: bindActionCreators(getLoggedInUser, dispatch),
  addCreditTransfer: bindActionCreators(addCreditTransfer, dispatch),
  invalidateCreditTransfers: bindActionCreators(invalidateCreditTransfers, dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(CreditTransferAddContainer);
